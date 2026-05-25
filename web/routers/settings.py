"""App settings router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import AppSetting
from web.schemas import AppSettingResponse, AppSettingUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=list[AppSettingResponse])
def list_settings(db: Session = Depends(get_db)):
    settings = db.query(AppSetting).all()
    results = []
    for s in settings:
        results.append(AppSettingResponse(
            key=s.key,
            value="••••••••" if s.is_secret else s.value,
            is_secret=bool(s.is_secret),
        ))
    return results


@router.put("/{key}", response_model=AppSettingResponse)
def upsert_setting(key: str, body: AppSettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if setting:
        setting.value = body.value
        setting.is_secret = int(body.is_secret)
    else:
        setting = AppSetting(key=key, value=body.value, is_secret=int(body.is_secret))
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return AppSettingResponse(
        key=setting.key,
        value="••••••••" if setting.is_secret else setting.value,
        is_secret=bool(setting.is_secret),
    )
