"""
KenAddme IT Links - Project Build Status Tracker (FastAPI module)
=================================================================

The same tracker as the workbook, the checklist and the HTML app, but as a
mountable FastAPI router so build status can live next to the rest of the
platform instead of in a spreadsheet.

What it does
------------
* Seeds every mandatory evidence item from the two approved frameworks the
  moment a project is registered, so nobody has to remember the gate lists.
* Records status, owner, dates and an evidence reference for each item.
* Records the gate decision separately from the evidence, because a gate is
  passed when the named authority decides, not when the work finishes.
* Reports completion per gate, treating items tailored out or covered by an
  approved exception as outside the denominator.

How to use it
-------------
Standalone:

    pip install fastapi uvicorn sqlalchemy pydantic
    uvicorn tracker_api:app --reload

Inside the existing Finance Management API, in app/main.py:

    from tracker_api import router as tracker_router
    app.include_router(tracker_router)

The module reads its seed content from `tracker_data.json`, which must sit in
the same directory. Editing that file changes what future projects are seeded
with; existing projects keep the items they were created with.

Note on authentication: every route below is open. Wire the platform's existing
`get_current_user` dependency into `router` (see AUTH HOOK near the bottom)
before this is exposed to anyone.
"""

from __future__ import annotations

import json
import os
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    func,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

# ---------------------------------------------------------------------------
# Seed content
# ---------------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "tracker_data.json"), encoding="utf-8") as fh:
    FRAMEWORK = json.load(fh)

STATUSES = FRAMEWORK["meta"]["statuses"]
DECISIONS = FRAMEWORK["meta"]["gate_decisions"]

# Statuses that take an item out of the completion denominator. Tailoring is
# allowed, but it must not fall below the Appendix A floor without an approved
# exception - which is why "Exception approved" is a distinct status.
TAILORED_OUT = {"Not applicable", "Exception approved"}


# ---------------------------------------------------------------------------
# Database models
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    """Declarative base. Swap for the platform's own Base when mounting."""


class TrackedProject(Base):
    """One project being taken through both governance tracks."""

    __tablename__ = "tracker_projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    register_id: Mapped[Optional[str]] = mapped_column(String(60), default=None)

    # Classification drives how deep the evidence must go. The highest
    # applicable condition controls the class.
    pm_class: Mapped[str] = mapped_column(String(60))       # Class A / B / C
    sdlc_class: Mapped[str] = mapped_column(String(60))     # Class 1 / 2 / 3 / 4
    classification_note: Mapped[Optional[str]] = mapped_column(Text, default=None)

    sponsor: Mapped[Optional[str]] = mapped_column(String(160), default=None)
    project_manager: Mapped[Optional[str]] = mapped_column(String(160), default=None)
    technical_lead: Mapped[Optional[str]] = mapped_column(String(160), default=None)
    service_owner: Mapped[Optional[str]] = mapped_column(String(160), default=None)
    release_authority: Mapped[Optional[str]] = mapped_column(String(160), default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    items: Mapped[List["EvidenceItem"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    gates: Mapped[List["GateDecision"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class EvidenceItem(Base):
    """One mandatory evidence item at one gate, for one project."""

    __tablename__ = "tracker_evidence_items"
    __table_args__ = (UniqueConstraint("project_id", "reference", name="uq_item_ref"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("tracker_projects.id"))

    track: Mapped[str] = mapped_column(String(10))          # "PM" or "SDLC"
    gate: Mapped[str] = mapped_column(String(10))           # "Gate 3", "G2", ...
    gate_name: Mapped[str] = mapped_column(String(120))
    stage: Mapped[str] = mapped_column(String(200))
    reference: Mapped[str] = mapped_column(String(20))      # "G2.04"
    sequence: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text)
    approver: Mapped[str] = mapped_column(Text)             # who decides this gate

    # The fields a team actually fills in.
    item_status: Mapped[str] = mapped_column(String(40), default="Not started")
    owner: Mapped[Optional[str]] = mapped_column(String(160), default=None)
    due_date: Mapped[Optional[date]] = mapped_column(Date, default=None)
    completed_date: Mapped[Optional[date]] = mapped_column(Date, default=None)
    evidence_reference: Mapped[Optional[str]] = mapped_column(Text, default=None)
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped[TrackedProject] = relationship(back_populates="items")


class GateDecision(Base):
    """The recorded decision at a gate. Kept apart from the evidence on purpose."""

    __tablename__ = "tracker_gate_decisions"
    __table_args__ = (UniqueConstraint("project_id", "track", "gate", name="uq_gate"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("tracker_projects.id"))

    track: Mapped[str] = mapped_column(String(10))
    gate: Mapped[str] = mapped_column(String(10))
    decision: Mapped[str] = mapped_column(String(40), default="Not yet held")
    decision_date: Mapped[Optional[date]] = mapped_column(Date, default=None)
    authority: Mapped[Optional[str]] = mapped_column(String(200), default=None)
    conditions: Mapped[Optional[str]] = mapped_column(Text, default=None)
    condition_owner: Mapped[Optional[str]] = mapped_column(String(160), default=None)
    condition_due: Mapped[Optional[date]] = mapped_column(Date, default=None)

    project: Mapped[TrackedProject] = relationship(back_populates="gates")


# ---------------------------------------------------------------------------
# Database session
# ---------------------------------------------------------------------------

# XAMPP MySQL/MariaDB is the local default. Override TRACKER_DATABASE_URL for
# another environment (for example, PostgreSQL in a hosted deployment).
DATABASE_URL = os.getenv(
    "TRACKER_DATABASE_URL",
    "mysql+pymysql://kenaddme_tracker:@127.0.0.1:3306/kenaddme_tracker",
)
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    """FastAPI dependency yielding a session and always closing it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Request and response schemas
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    name: str
    register_id: Optional[str] = None
    pm_class: str = Field(description="Class A - Strategic/High Risk, Class B - Standard/Medium Risk, or Class C - Small/Low Risk")
    sdlc_class: str = Field(description="Class 1 Experimental, Class 2 Standard, Class 3 High, or Class 4 Critical")
    classification_note: Optional[str] = None
    sponsor: Optional[str] = None
    project_manager: Optional[str] = None
    technical_lead: Optional[str] = None
    service_owner: Optional[str] = None
    release_authority: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    register_id: Optional[str]
    pm_class: str
    sdlc_class: str
    classification_note: Optional[str]
    sponsor: Optional[str]
    project_manager: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ItemOut(BaseModel):
    id: int
    track: str
    gate: str
    gate_name: str
    stage: str
    reference: str
    description: str
    approver: str
    item_status: str
    owner: Optional[str]
    due_date: Optional[date]
    completed_date: Optional[date]
    evidence_reference: Optional[str]
    notes: Optional[str]

    model_config = {"from_attributes": True}


class ItemUpdate(BaseModel):
    """Every field optional: callers send only what changed."""

    item_status: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[date] = None
    completed_date: Optional[date] = None
    evidence_reference: Optional[str] = None
    notes: Optional[str] = None


class GateUpdate(BaseModel):
    decision: str
    decision_date: Optional[date] = None
    authority: Optional[str] = None
    conditions: Optional[str] = None
    condition_owner: Optional[str] = None
    condition_due: Optional[date] = None


class GateStatus(BaseModel):
    track: str
    gate: str
    gate_name: str
    total_items: int
    complete: int
    in_progress: int
    tailored_out: int
    outstanding: int
    percent_complete: float
    evidence_position: str
    decision: str
    decision_date: Optional[date]
    authority: Optional[str]
    conditions: Optional[str]


class ProjectStatus(BaseModel):
    project: ProjectOut
    gates: List[GateStatus]
    overall_percent: float


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------

def seed_items(db: Session, project: TrackedProject) -> None:
    """
    Create one EvidenceItem per mandatory evidence line in both frameworks, plus
    a blank GateDecision per gate. Called once, when the project is registered.
    """
    for track in FRAMEWORK["tracks"]:
        for stage in track["stages"]:
            for n, description in enumerate(stage["items"], start=1):
                db.add(
                    EvidenceItem(
                        project_id=project.id,
                        track=track["id"],
                        gate=stage["gate"],
                        gate_name=stage["gate_name"],
                        stage=stage["stage"],
                        reference=f'{stage["gate"]}.{n:02d}',
                        sequence=n,
                        description=description,
                        approver=stage["approver"],
                    )
                )
            db.add(
                GateDecision(
                    project_id=project.id,
                    track=track["id"],
                    gate=stage["gate"],
                )
            )
    db.commit()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/tracker", tags=["build status tracker"])


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    """Register a project and seed its full evidence checklist."""
    project = TrackedProject(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    seed_items(db, project)
    return project


@router.get("/projects", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.scalars(select(TrackedProject).order_by(TrackedProject.created_at.desc())).all()


@router.get("/projects/{project_id}/items", response_model=List[ItemOut])
def list_items(
    project_id: int,
    track: Optional[str] = None,
    gate: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Evidence items, optionally narrowed to one track or one gate."""
    query = select(EvidenceItem).where(EvidenceItem.project_id == project_id)
    if track:
        query = query.where(EvidenceItem.track == track)
    if gate:
        query = query.where(EvidenceItem.gate == gate)
    items = db.scalars(query.order_by(EvidenceItem.track, EvidenceItem.id)).all()
    if not items:
        raise HTTPException(status_code=404, detail="No evidence items found for that project or filter")
    return items


@router.patch("/items/{item_id}", response_model=ItemOut)
def update_item(item_id: int, payload: ItemUpdate, db: Session = Depends(get_db)):
    """Update one evidence item. Status must be one of the framework statuses."""
    item = db.get(EvidenceItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    changes = payload.model_dump(exclude_unset=True)

    if "item_status" in changes and changes["item_status"] not in STATUSES:
        raise HTTPException(status_code=422, detail=f"Status must be one of: {', '.join(STATUSES)}")

    # A completed item needs somewhere to find the evidence. This is the whole
    # point of the tracker: a tick with no locatable record is not evidence.
    if changes.get("item_status") == "Complete":
        reference = changes.get("evidence_reference", item.evidence_reference)
        if not reference:
            raise HTTPException(
                status_code=422,
                detail="Set an evidence_reference before marking an item Complete",
            )

    for key, value in changes.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.put("/projects/{project_id}/gates/{track}/{gate}", response_model=GateStatus)
def record_gate_decision(
    project_id: int,
    track: str,
    gate: str,
    payload: GateUpdate,
    db: Session = Depends(get_db),
):
    """
    Record the decision at a gate.

    Approving a gate while required evidence is outstanding is refused. Use
    'Approve with conditions' with a named owner and due date, or 'Hold'.
    """
    record = db.scalar(
        select(GateDecision).where(
            GateDecision.project_id == project_id,
            GateDecision.track == track,
            GateDecision.gate == gate,
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Gate not found for that project")
    if payload.decision not in DECISIONS:
        raise HTTPException(status_code=422, detail=f"Decision must be one of: {', '.join(DECISIONS)}")

    summary = _gate_summary(db, project_id, track, gate)

    if payload.decision == "Approve" and summary["outstanding"] > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f'{summary["outstanding"]} required evidence item(s) are outstanding at {gate}. '
                "Complete them, tailor them out with an approved exception, or record "
                "'Approve with conditions' or 'Hold'."
            ),
        )
    if payload.decision == "Approve with conditions" and not (payload.conditions and payload.condition_owner):
        raise HTTPException(
            status_code=422,
            detail="Approving with conditions requires the conditions and a named condition owner",
        )

    for key, value in payload.model_dump().items():
        setattr(record, key, value)
    db.commit()
    return _gate_status_model(db, project_id, track, gate)


@router.get("/projects/{project_id}/status", response_model=ProjectStatus)
def project_status(project_id: int, db: Session = Depends(get_db)):
    """The dashboard: completion and decision position for every gate."""
    project = db.get(TrackedProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    gates: List[GateStatus] = []
    for track in FRAMEWORK["tracks"]:
        for stage in track["stages"]:
            gates.append(_gate_status_model(db, project_id, track["id"], stage["gate"]))

    denominator = sum(g.total_items - g.tailored_out for g in gates)
    complete = sum(g.complete for g in gates)
    overall = round(complete / denominator, 4) if denominator else 1.0

    return ProjectStatus(project=ProjectOut.model_validate(project), gates=gates, overall_percent=overall)


@router.get("/reference/artefact-floor")
def artefact_floor():
    """Appendix A: the enforceable tailoring floor by software class."""
    return FRAMEWORK["artefact_floor"]


@router.get("/reference/alignment")
def alignment():
    """Appendix I: gate alignment, evidence reuse and classification mapping."""
    return {"gates": FRAMEWORK["alignment"], "classes": FRAMEWORK["class_mapping"]}


@router.get("/reference/measures")
def measures():
    """The Year-One mandatory measurement set from both frameworks."""
    return FRAMEWORK["measures"]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _gate_summary(db: Session, project_id: int, track: str, gate: str) -> dict:
    """Count evidence items at a gate by status."""
    items = db.scalars(
        select(EvidenceItem).where(
            EvidenceItem.project_id == project_id,
            EvidenceItem.track == track,
            EvidenceItem.gate == gate,
        )
    ).all()
    if not items:
        raise HTTPException(status_code=404, detail="Gate not found for that project")

    total = len(items)
    complete = sum(1 for i in items if i.item_status == "Complete")
    tailored = sum(1 for i in items if i.item_status in TAILORED_OUT)
    in_progress = sum(1 for i in items if i.item_status in ("In progress", "Submitted for review"))
    denominator = total - tailored
    return {
        "items": items,
        "total": total,
        "complete": complete,
        "tailored": tailored,
        "in_progress": in_progress,
        "outstanding": denominator - complete,
        "percent": round(complete / denominator, 4) if denominator else 1.0,
    }


def _gate_status_model(db: Session, project_id: int, track: str, gate: str) -> GateStatus:
    """Build the response model for one gate."""
    summary = _gate_summary(db, project_id, track, gate)
    decision = db.scalar(
        select(GateDecision).where(
            GateDecision.project_id == project_id,
            GateDecision.track == track,
            GateDecision.gate == gate,
        )
    )
    first = summary["items"][0]

    if summary["total"] - summary["tailored"] == 0:
        position = "All items tailored out"
    elif summary["outstanding"] == 0:
        position = "Evidence complete"
    else:
        position = f'{summary["outstanding"]} item(s) outstanding'

    return GateStatus(
        track=track,
        gate=gate,
        gate_name=first.gate_name,
        total_items=summary["total"],
        complete=summary["complete"],
        in_progress=summary["in_progress"],
        tailored_out=summary["tailored"],
        outstanding=summary["outstanding"],
        percent_complete=summary["percent"],
        evidence_position=position,
        decision=decision.decision if decision else "Not yet held",
        decision_date=decision.decision_date if decision else None,
        authority=decision.authority if decision else None,
        conditions=decision.conditions if decision else None,
    )


# ---------------------------------------------------------------------------
# Standalone application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="KenAddme IT Links - Project Build Status Tracker",
    description=(
        "Gate and evidence tracking for the Project Management Framework v1.1 "
        "and the Software Development and Engineering Framework v1.2."
    ),
    version="1.0.0",
)


@app.get("/", include_in_schema=False)
def tracker_landing_page() -> FileResponse:
    """Serve the controlled HTML tracker as the application landing page."""
    return FileResponse(
        os.path.join(HERE, "KenAddme_Build_Status_Tracker.html"),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )

# AUTH HOOK: when mounting inside the Finance Management API, protect the whole
# router with the platform's existing dependency instead of including it bare:
#
#     from app.auth import get_current_user
#     app.include_router(tracker_router, dependencies=[Depends(get_current_user)])
#
app.include_router(router)


@app.on_event("startup")
def create_tables() -> None:
    """
    Fine for a first run. Once the schema settles, move to Alembic migrations
    the same way the main API plans to.
    """
    Base.metadata.create_all(bind=engine)
