def test_scaffold_is_importable() -> None:
    from app.main import app

    assert app.title == "RepoMind AI Service"
