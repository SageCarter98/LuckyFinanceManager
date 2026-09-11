"""Identifier masking for the staff support console (Workstream G
acceptance criterion: "identifiers are masked"). Only ever applied to
values displayed back to staff -- app.models.AdminAccessLog still stores
the raw searched email, because an audit trail that can't say what was
actually looked up isn't an audit trail."""


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    visible = local[0] if local else ""
    return f"{visible}***@{domain}"


def mask_name(full_name: str) -> str:
    words = full_name.split()
    if not words:
        return "***"
    return " ".join(f"{word[0]}***" for word in words)
