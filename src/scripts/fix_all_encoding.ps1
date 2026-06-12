$files = Get-ChildItem -Path "c:\Users\danie\Projects\migra\src" -Filter "*.tsx" -Recurse
foreach ($file in $files) {
    Write-Host "Fixing encoding for: $($file.FullName)"
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    
    # Common Portuguese Mojibake (Literal Replace)
    $content = $content.Replace("Ã§Ã£", "ção")
    $content = $content.Replace("Ã§Ãµ", "ções")
    $content = $content.Replace("Ã§", "ç")
    $content = $content.Replace("Ã£", "ã")
    $content = $content.Replace("Ãµ", "õ")
    $content = $content.Replace("Ã³", "ó")
    $content = $content.Replace("Ã©", "é")
    $content = $content.Replace("Ãª", "ê")
    $content = $content.Replace("Ã­", "í")
    $content = $content.Replace("Ã¡", "á")
    $content = $content.Replace("Ãº", "ú")
    $content = $content.Replace("Ã ", "à")
    $content = $content.Replace("Ã‚", "Â")
    $content = $content.Replace("Ã‡", "Ç")
    $content = $content.Replace("Ã‰", "É")
    $content = $content.Replace("ÃŠ", "Ê")
    $content = $content.Replace("Ã“", "Ó")
    $content = $content.Replace("Ãš", "Ú")
    $content = $content.Replace("Ã€", "À")
    $content = $content.Replace("Ã´", "ô")
    $content = $content.Replace("Ã¢", "â")
    $content = $content.Replace("ÃŽ", "Î")
    $content = $content.Replace("Ã¬", "ì")
    $content = $content.Replace("Â·", "·")
    $content = $content.Replace("â€¢", "•")
    $content = $content.Replace("Âº", "º")
    $content = $content.Replace("Âª", "ª")
    
    # Specific ones found in searches
    $content = $content.Replace("PrecedÃªncia", "Precedência")
    $content = $content.Replace("TÃ©cnica", "Técnica")
    $content = $content.Replace("ExecuÃ§Ã£o", "Execução")
    $content = $content.Replace("SequÃªncia", "Sequência")
    $content = $content.Replace("InÃ­cio", "Início")
    $content = $content.Replace("TÃ©rmino", "Término")
    $content = $content.Replace("DuraÃ§Ã£o", "Duração")
    $content = $content.Replace("RÃ¡pido", "Rápido")
    $content = $content.Replace("HistÃ³rico", "Histórico")
    $content = $content.Replace("Ãšnico", "Único")
    
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
}
Write-Host "Encoding fix finished."
