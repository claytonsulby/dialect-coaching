from sqlalchemy.orm import Session

from web.models import AccentProfile, SignaturePattern


def aggregate_accent_signature(db: Session, profile_id: int) -> AccentProfile | None:
    """
    Recompute an accent profile's signature patterns from linked samples.

    1. Gather all PhoneChange records from transcribed audio linked to this profile
    2. For each unique (expected_phone, actual_phone) pair, count:
       a. How many distinct audio resources exhibit this change
       b. Total occurrence count
    3. Compute frequency = audio_count / total_audios
    4. Keep patterns where frequency >= 0.2 (seen in at least 20% of samples)
    5. Replace existing patterns on the profile

    NOTE: This references SpeakerSample which is in another unit.
    For now, return the profile as-is since SpeakerSample linking
    comes from the samples unit. The algorithm structure is ready
    for integration.
    """
    profile = db.get(AccentProfile, profile_id)
    if not profile:
        return None

    # Future integration: query SpeakerSample -> AudioResource -> PhoneChanges
    # and rebuild patterns from real data. For now, return current state.
    return profile


def compute_accent_strength(
    phone_changes: list[tuple[str, str]],
    patterns: list[SignaturePattern],
) -> float:
    """
    Compute how strongly a set of phone changes matches an accent profile.

    Args:
        phone_changes: list of (expected_phone, actual_phone) tuples from a sample
        patterns: the accent profile's signature patterns

    Returns:
        float 0.0-1.0 representing accent strength
    """
    if not patterns:
        return 0.0

    change_set = set(phone_changes)
    total_weight = sum(p.frequency for p in patterns)
    if total_weight == 0:
        return 0.0

    matched_weight = sum(
        p.frequency
        for p in patterns
        if (p.expected_phone, p.actual_phone) in change_set
    )

    return round(matched_weight / total_weight, 3)
