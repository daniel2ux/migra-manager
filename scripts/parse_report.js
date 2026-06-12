const fs = require("fs");
const ts = require("typescript");

const file = "src/app/relatorios/page.tsx";
const src = fs.readFileSync(file, "utf8");
const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
);
const diags = sf.parseDiagnostics.map((d) => ({
    line: d.start ? sf.getLineAndCharacterOfPosition(d.start).line + 1 : null,
    message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
}));

console.log(JSON.stringify(diags, null, 2));
