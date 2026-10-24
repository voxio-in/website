'''
Voice samples for the dashboard's Voice tab: one short line per known voice,
spoken by the voice backend's own TTS clients, uploaded to R2 as WAV files.

    cd D:/vx/vx-backend-monorepo
    uv run python D:/vx/website/web/scripts/voice-samples.py [--only sarvam] [--force]

It reads the voices from src/lib/dashboard/providers.ts (Deepgram Aura voices,
Sarvam Bulbul v3 and v2 voices). Providers whose voice is a free-text ID
(ElevenLabs, Google, Resemble) have no list, so no samples. Keys come from the
backend's .env and callbot/.env (TTS) and the website's .env (R2).

Objects go to samples/voices/<service>/<voice>.wav, and the list of voices
that have one is written to src/lib/dashboard/voice-samples.json, which the
dashboard reads to decide where to show Play. Existing objects are skipped
unless --force.
'''

import argparse
import asyncio
import io
import json
import logging
import os
import re
import sys
import wave
from pathlib import Path

WEB = Path(__file__).resolve().parents[1]
BACKEND = Path('D:/vx/vx-backend-monorepo')
RATE = 24_000


def load_env(path: Path) -> None:
    '''KEY=value lines; values already in the environment win.'''
    if not path.exists():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$', line)
        if m and m.group(1) not in os.environ:
            os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


for env in (BACKEND / '.env', BACKEND / 'callbot' / '.env', WEB / '.env'):
    load_env(env)



def _load_clients():
    """
    The Deepgram and Sarvam clients, loaded without the `tts` and `services`
    packages' __init__ files: those import every provider and audio helper,
    some through torch, and torch's CUDA DLLs are blocked by Windows
    Application Control on some machines. These two clients need none of it.
    The one helper Deepgram imports (astrip_wav_header) is plain Python, so
    its source is taken from the backend file as it is, without importing it.
    """
    import ast
    import importlib
    import types
    audio = BACKEND / 'services' / 'src' / 'services' / 'audio' / '_audio.py'
    tree = ast.parse(audio.read_text(encoding='utf-8'))
    wanted = {'_find_wav_payload_start', 'astrip_wav_header'}
    funcs = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name in wanted]
    services = types.ModuleType('services')
    exec(compile(ast.Module(body=[ast.parse('from typing import AsyncIterator').body[0], *funcs], type_ignores=[]), str(audio), 'exec'), services.__dict__)
    sys.modules['services'] = services
    root = BACKEND / 'tts' / 'src' / 'tts'
    for name, path in (('tts', root), ('tts.clients', root / 'clients'), ('tts.clients.streaming_', root / 'clients' / 'streaming_')):
        pkg = types.ModuleType(name)
        pkg.__path__ = [str(path)]
        sys.modules[name] = pkg
    mods = {name: importlib.import_module(name) for name in ('tts.clients.tts_', 'tts.clients.streaming_.deepgram_', 'tts.clients.streaming_.sarvam_')}
    return mods['tts.clients.streaming_.deepgram_'].DEEPGRAM_Streaming_TTS, mods['tts.clients.streaming_.sarvam_'].SARVAM_Streaming_TTS


DEEPGRAM_Streaming_TTS, SARVAM_Streaming_TTS = _load_clients()

LINES = {
    'en': "Hi, I'm {name}. This is how I'll sound when I talk to the people who call you.",
    'es': 'Hola, soy {name}. Así sonaré cuando hable con quienes te llamen.',
    'de': 'Hallo, ich bin {name}. So klinge ich, wenn ich mit Ihren Anrufern spreche.',
    'fr': "Bonjour, je suis {name}. Voici ma voix quand je parle à ceux qui vous appellent.",
    'it': 'Ciao, sono {name}. Ecco come suonerò quando parlo con chi ti chiama.',
    'ja': 'こんにちは、{name}です。お電話いただいた方とは、このような声でお話しします。',
}


def voices() -> list[dict]:
    '''Every voice with a fixed list in providers.ts.'''
    src = (WEB / 'src/lib/dashboard/providers.ts').read_text(encoding='utf-8')
    out: list[dict] = []
    for model, lang, name in re.findall(r"\['(aura-2-[a-z]+-([a-z]{2}))', '([^']+)'", src):
        out.append({'service': 'deepgram', 'voice': model, 'name': name, 'config': {'service': 'deepgram', 'model': model}, 'line': LINES.get(lang, LINES['en'])})
    for const, model in (('SARVAM_V3', 'bulbul:v3'), ('SARVAM_V2', 'bulbul:v2')):
        m = re.search(const + r" = \[([^\]]*)\]", src)
        for v in re.findall(r"'([a-z]+)'", m.group(1) if m else ''):
            out.append({'service': 'sarvam', 'voice': v, 'name': v.capitalize(),
                        'config': {'service': 'sarvam', 'model': model, 'voice': v, 'language': 'en-IN'}, 'line': LINES['en']})
    return out


async def speak(item: dict) -> bytes:
    '''16-bit PCM at RATE from the backend's own client, wrapped as a WAV file.'''
    log = logging.getLogger('voice-samples')
    config = {**item['config'], 'encoding': 'linear16', 'sample-rate': RATE}
    client = (DEEPGRAM_Streaming_TTS if item['service'] == 'deepgram' else SARVAM_Streaming_TTS)(config, log)
    pcm = bytearray()
    try:
        async for chunk in client.stream(item['line'].format(name=item['name'])):
            pcm.extend(chunk)
    finally:
        await client.stop()
    if len(pcm) < RATE:  # under half a second: something went wrong
        raise RuntimeError(f'only {len(pcm)} bytes of audio')
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(pcm))
    return buf.getvalue()


def r2():
    import boto3
    for k in ('R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'):
        if not os.environ.get(k):
            sys.exit(f'{k} is not set (website .env).')
    return boto3.client('s3', endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
                        region_name='auto')


def exists(s3, key: str) -> bool:
    try:
        s3.head_object(Bucket=os.environ['R2_BUCKET'], Key=key)
        return True
    except Exception:
        return False


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', choices=['deepgram', 'sarvam'])
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()

    s3 = r2()
    manifest_path = WEB / 'src/lib/dashboard/voice-samples.json'
    manifest: dict[str, list[str]] = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    items = [v for v in voices() if not args.only or v['service'] == args.only]
    failed: list[str] = []
    for i, item in enumerate(items, 1):
        key = f"samples/voices/{item['service']}/{item['voice']}.wav"
        have = manifest.setdefault(item['service'], [])
        if not args.force and exists(s3, key):
            print(f'[{i}/{len(items)}] {key} already there')
        else:
            try:
                body = await speak(item)
                s3.put_object(Bucket=os.environ['R2_BUCKET'], Key=key, Body=body, ContentType='audio/wav', CacheControl='public, max-age=31536000')
                print(f'[{i}/{len(items)}] {key} {len(body) // 1024} KB')
            except Exception as e:  # one bad voice doesn't stop the rest
                failed.append(f"{item['service']}/{item['voice']}: {e}")
                print(f'[{i}/{len(items)}] {key} FAILED: {e}')
                continue
        if item['voice'] not in have:
            have.append(item['voice'])
    for k in manifest:
        manifest[k].sort()
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'Manifest: {manifest_path} ({sum(len(v) for v in manifest.values())} voices)')
    if failed:
        print(f'{len(failed)} failed:\n  ' + '\n  '.join(failed))


if __name__ == '__main__':
    asyncio.run(main())
