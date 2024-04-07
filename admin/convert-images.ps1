# Get all .jpg files in the static/images/team directory
$jpgFiles = Get-ChildItem -Path .\static\images\team -Filter *.jpg -File

foreach ($file in $jpgFiles) {
    # Define the output file name
    $outputFile = $file.FullName -replace '\.jpg$', '.webp'
    Write-Output "Converting $file to $outputFile"


    # Convert the .jpg file to .webp format using dwebp
    & 'C:\Users\hugoa\Downloads\libwebp-1.3.2-windows-x64\libwebp-1.3.2-windows-x64\bin\cwebp.exe' $file.FullName -o $outputFile -quiet
}

# Get all .jpg files in the static/images/team directory
$jpgFiles = Get-ChildItem -Path .\static\images\team -Filter *.jpeg -File

foreach ($file in $jpgFiles) {
    # Define the output file name
    $outputFile = $file.FullName -replace '\.jpeg$', '.webp'
    Write-Output "Converting $file to $outputFile"


    # Convert the .jpg file to .webp format using dwebp
    & 'C:\Users\hugoa\Downloads\libwebp-1.3.2-windows-x64\libwebp-1.3.2-windows-x64\bin\cwebp.exe' $file.FullName -o $outputFile -quiet
}

# Get all .jpg files in the static/images/team directory
$jpgFiles = Get-ChildItem -Path .\static\images\team -Filter *.png -File

foreach ($file in $jpgFiles) {
    # Define the output file name
    $outputFile = $file.FullName -replace '\.png$', '.webp'
    Write-Output "Converting $file to $outputFile"


    # Convert the .jpg file to .webp format using dwebp
    & 'C:\Users\hugoa\Downloads\libwebp-1.3.2-windows-x64\libwebp-1.3.2-windows-x64\bin\cwebp.exe' $file.FullName -o $outputFile -quiet
}