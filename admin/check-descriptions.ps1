# Specify the directory where your .md files are located
$directory = "content"

# Get all .md files in the directory and its subdirectories
$files = Get-ChildItem -Path $directory -Filter *.md -Recurse

# Initialize a counter for files with missing punctuation
$badCounter = 0
$fileCounter = 0

foreach ($file in $files) {
    $fileCounter++
    # Read the file
    $content = Get-Content $file.FullName -Raw

    # Extract the YAML front matter
    $frontMatter = $content -split '---' | Select-Object -Index 1

    # Convert the YAML to a PowerShell object
    $yaml = ConvertFrom-Yaml $frontMatter

    # Check if the 'description' field does not end with a period
    if ($yaml.description -and $yaml.description.Trim()[-1] -notin @('.', '!')) {
        # Increment the counter
        $badCounter++
        # Output the relative path of the file
        $relativePath = Resolve-Path -Path $file.FullName -Relative
        Write-Output "$relativePath has a description that does not end with punctuation."
    }
}

# If no files were found with missing punctuation, output a message
if ($badCounter -eq 0) {
    Write-Output "Verified $fileCounter files. All descriptions end with punctuation. Proper grammar FTW!"
}