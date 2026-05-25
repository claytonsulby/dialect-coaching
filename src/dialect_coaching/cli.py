from collections import Counter
from pathlib import Path
from typing import Annotated, Optional

import typer
from rich.console import Console

from dialect_coaching.transcriber import transcribe_aligned, format_aligned

app = typer.Typer(
    name="dialect-coaching",
    help="Accent-aware phonetic transcription from audio.",
)
console = Console()


@app.command()
def transcribe(
    audio_file: Annotated[Path, typer.Argument(help="Path to audio file (wav, mp3, flac)")],
    whisper_model: Annotated[str, typer.Option("--model", "-m", help="Whisper model size: tiny, base, small, medium, large")] = "base",
    output: Annotated[Optional[Path], typer.Option("--output", "-o", help="Write output to file")] = None,
):
    """Transcribe audio to text + standard IPA + actual IPA with accent mapping."""
    if not audio_file.exists():
        console.print(f"[red]Error:[/red] File not found: {audio_file}")
        raise typer.Exit(1)

    console.print(f"[dim]Processing:[/dim] {audio_file.name}")

    def status(msg):
        console.print(f"[dim]{msg}[/dim]")

    segments = transcribe_aligned(audio_file, whisper_size=whisper_model, on_status=status)
    text_output = format_aligned(segments)

    console.print()
    for seg in segments:
        console.print(f"[bold]{seg.text}[/bold]")
        console.print(f"[blue]  Standard: /{seg.expected_phonemes}/[/blue]")
        console.print(f"[green]  Heard:    /{seg.actual_phonemes}/[/green]")
        if seg.accent_map:
            for m in seg.accent_map:
                changes = ", ".join(f"{c.expected}→{c.actual}" for c in m.changes)
                console.print(f"[yellow]    {m.word}: /{m.expected}/ → /{m.actual}/  [{changes}][/yellow]")
        console.print()

    phone_counts: Counter[tuple[str, str]] = Counter()
    for seg in segments:
        for m in seg.accent_map:
            for c in m.changes:
                phone_counts[(c.expected, c.actual)] += 1

    if phone_counts:
        console.print("[bold]" + "=" * 40 + "[/bold]")
        console.print("[bold]ACCENT SUMMARY[/bold]")
        console.print("[bold]" + "=" * 40 + "[/bold]")
        for (exp, act), count in phone_counts.most_common():
            if count >= 2:
                console.print(f"  [yellow]/{exp}/ → /{act}/[/yellow]  ({count}×)")
        console.print()

    if output:
        output.write_text(text_output)
        console.print(f"[dim]Written to:[/dim] {output}")


if __name__ == "__main__":
    app()
