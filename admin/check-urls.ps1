# Get all .md files in the content folder and subfolders
$mdFiles = Get-ChildItem -Path .\content -Filter *.md -Recurse -File
$fileCounter = 0

foreach ($file in $mdFiles) {
    $fileCounter++
    # Read the file
    $content = Get-Content $file.FullName -Raw

    # Extract the YAML front matter
    $frontMatter = $content -split '---' | Select-Object -Index 1

    # Convert the YAML to a PowerShell object
    $yaml = ConvertFrom-Yaml $frontMatter


    # Check if the file has a YAML front matter with an externalUrl property
    if ($yaml.externalUrl) {
        $url = $yaml.externalUrl

        try {
            # Test the URL with HEAD method
            $response = Invoke-WebRequest -Uri $url -Method Head -ErrorAction Stop
            # If the URL is valid, output a success message
            Write-Host "Valid URL: $url" -ForegroundColor Green
        }
        catch {
            try {
                # If HEAD method fails, try with GET method

                $response = Invoke-WebRequest -Uri $url -Method Get -ErrorAction Stop
                # If the URL is valid, output a success message
                Write-Host "Valid URL: $url" -ForegroundColor Green
            }
            catch {
                # If the URL is not valid, output the file name and relative path
                Write-Warning "Bad URL: $url in $($file.Name), Path: $($file.FullName)"
            }
        }
    }


}

Write-Output "Verified $fileCounter files for valid URLs."