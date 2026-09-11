from app.core.masking import mask_email, mask_name


def test_mask_email_keeps_domain_hides_local_part():
    assert mask_email("support-abc123@example.com") == "s***@example.com"
    assert mask_email("a@example.com") == "a***@example.com"


def test_mask_email_handles_no_at_sign():
    assert mask_email("not-an-email") == "***"


def test_mask_name_masks_each_word():
    assert mask_name("Support User") == "S*** U***"
    assert mask_name("Cher") == "C***"


def test_mask_name_handles_empty_string():
    assert mask_name("") == "***"
