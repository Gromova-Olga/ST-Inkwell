export function buildExportHtml({ chatName, date, messagesHtml, count }) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chatName} — Chat Export</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@300;400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: #0d0d14;
            color: #c8c8d8;
            font-family: 'Crimson Pro', Georgia, serif;
            font-size: 18px;
            line-height: 1.7;
            min-height: 100vh;
            padding: 0;
        }

        .page-wrapper {
            max-width: 860px;
            margin: 0 auto;
            padding: 60px 40px 100px;
        }

        header {
            border-bottom: 1px solid #2a2a3a;
            padding-bottom: 28px;
            margin-bottom: 52px;
        }

        header h1 {
            font-size: 2em;
            font-weight: 300;
            letter-spacing: 0.04em;
            color: #e8e0f0;
        }

        header .export-meta {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.62em;
            color: #555568;
            margin-top: 8px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .messages {
            display: flex;
            flex-direction: column;
            gap: 0;
        }

        .message {
            padding: 28px 0;
            border-bottom: 1px solid #1a1a26;
            position: relative;
        }

        .message:last-child { border-bottom: none; }

        .message-header {
            display: flex;
            align-items: baseline;
            gap: 14px;
            margin-bottom: 10px;
        }

        .message-name {
            font-weight: 600;
            font-size: 0.78em;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        .message-user .message-name { color: #a0c4ff; }
        .message-bot .message-name { color: #c9a0ff; }

        .msg-meta {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .msg-num {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.6em;
            color: #444458;
            letter-spacing: 0.05em;
        }

        .msg-time {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.6em;
            color: #444458;
        }

        .message-body {
            font-size: 1em;
            color: #b8b8cc;
            line-height: 1.75;
            font-weight: 300;
        }

        .message-user .message-body { color: #ccd8ee; }

        em, i { font-style: italic; color: #9898b8; }

        footer {
            margin-top: 60px;
            padding-top: 24px;
            border-top: 1px solid #1a1a26;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.58em;
            color: #333344;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="page-wrapper">
        <header>
            <h1>${chatName}</h1>
            <div class="export-meta">Exported ${date} &nbsp;·&nbsp; ${count} messages</div>
        </header>
        <div class="messages">
            ${messagesHtml}
        </div>
        <footer>Chat Exporter · SillyTavern</footer>
    </div>
</body>
</html>`;
}
