from pathlib import Path
from typing import Annotated, Optional

import typer
from rich.console import Console
from rich.table import Table

from dialect_coaching.transcriber import transcribe_phones, transcribe_phones_with_timestamps

app = typer.Typer(
    name="dialect-coaching",
    help="Accent-aware phonetic transcription from audio.",
)
console = Console()


@app.command()
def transcribe(
    audio_file: Annotated[Path, typer.Argument(help="Path to audio file (wav, mp3, flac)")],
    timestamps: Annotated[bool, typer.Option("--timestamps", "-t", help="Show phone-level timestamps")] = False,
    output: Annotated[Optional[Path], typer.Option("--output", "-o", help="Write output to file")] = None,
):
    """Transcribe audio to IPA phones based on actual pronunciation."""
    if not audio_file.exists():
        console.print(f"[red]Error:[/red] File not found: {audio_file}")
        raise typer.Exit(1)

    console.print(f"[dim]Processing:[/dim] {audio_file.name}")
    console.print("[dim]Loading model (first run downloads ~1.2GB)...[/dim]")

    if timestamps:
        phones = transcribe_phones_with_timestamps(audio_file)
        table = Table(title="Phonetic Transcription")
        table.add_column("Time", style="dim")
        table.add_column("Phone", style="bold green")
        for time_s, phone in phones:
            table.add_row(f"{time_s:.3f}s", phone)
        console.print(table)
        text_output = " ".join(phone for _, phone in phones)
    else:
        text_output = transcribe_phones(audio_file)
        console.print(f"\n[bold green]{text_output}[/bold green]\n")

    if output:
        output.write_text(text_output)
        console.print(f"[dim]Written to:[/dim] {output}")


if __name__ == "__main__":
    app()
