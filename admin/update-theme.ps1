param([string]$commitMessage = "Update")

cd themes/pnp-hugo-theme
git add .
git commit -m $commitMessage
git push origin main
cd ../..
git add themes/pnp-hugo-theme
git commit -m "Update theme submodule: $commitMessage"
git push origin master