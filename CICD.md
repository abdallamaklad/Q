# CI/CD setup (GitHub Actions → VPS)

`.github/workflows/deploy.yml` runs typecheck + lint + tests on every push/PR, and
on push to `main` it SSHes into the VPS, fast-forwards the repo, and rebuilds the
Docker stack. One-time setup below.

## 1. Create the GitHub repo
Create an **empty private repo** at github.com (no README/.gitignore). Copy its URL.

## 2. Push the local repo (on your Mac)
```bash
cd ~/Desktop/Claude/qulture
git remote add origin https://github.com/<you>/qulture.git   # or the SSH URL
git push -u origin main
```

## 3. Generate a deploy SSH key (on your Mac)
A dedicated key just for GitHub Actions → VPS:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/qulture_deploy -N "" -C "github-actions-qulture"
cat ~/.ssh/qulture_deploy.pub   # PUBLIC key  → goes on the VPS (step 4)
cat ~/.ssh/qulture_deploy       # PRIVATE key → goes in GitHub secret (step 5)
```

## 4. Authorize the key on the VPS
```bash
# paste the PUBLIC key value:
echo "ssh-ed25519 AAAA...github-actions-qulture" >> ~/.ssh/authorized_keys
```

## 5. Add GitHub Actions secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
| Name | Value |
|---|---|
| `VPS_HOST` | `76.13.190.19` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | the full **private** key (`-----BEGIN…END-----`) |

## 6. Convert the VPS app dir to a git clone (on the VPS, one time)
The VPS currently has the code from a tarball. Point it at GitHub without losing
`.env` or Docker volumes (data is in Docker, not the folder):
```bash
apt-get install -y git
cd ~/qulture
git init
git remote add origin https://github.com/<you>/qulture.git
git fetch origin
git reset --hard origin/main
```
For a **private** repo the VPS needs read access — easiest is a read-only
**deploy key**: `ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""`, add the
`.pub` to the repo's **Settings → Deploy keys**, and use the SSH clone URL
(`git remote set-url origin git@github.com:<you>/qulture.git`).

## Done
From now on: `git push` → Actions runs checks → deploys to the VPS automatically.
Watch runs under the repo's **Actions** tab.
