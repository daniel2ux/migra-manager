const fs = require("fs");
const ts = require("typescript");

const code = fs.readFileSync("src/app/relatorios/page.tsx", "utf8");
const sf = ts.createSourceFile(
    "page.tsx",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
);

const diags = sf.parseDiagnostics.map((d) => ({
    start: d.start,
    line:
        d.start != null
            ? sf.getLineAndCharacterOfPosition(d.start).line + 1
            : null,
    message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
}));

console.log(JSON.stringify(diags, null, 2));
