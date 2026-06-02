# UX 라이팅 정리기

아무 텍스트나 넣으면 UX 라이팅 모범 사례에 맞춰 다듬어 주는 웹앱입니다.
한국어·영어를 자동으로 인식하고, 등록한 용어집(권장/피할 표현)을 반영합니다.

## 구성

- **프론트엔드**: React + Vite (`src/`)
- **백엔드**: Vercel 서버리스 함수 (`api/polish.js`) — API 키를 서버에서만 사용해 노출을 방지
- **저장**: 용어집은 브라우저(localStorage)에 저장

---

## 1. 로컬에서 실행하기

필요한 것: Node.js 18 이상

```bash
npm install
```

`.env.example`을 복사해 `.env` 파일을 만들고 본인 API 키를 넣습니다.
(API 키는 https://console.anthropic.com 에서 발급)

```bash
cp .env.example .env
# .env 파일을 열어 ANTHROPIC_API_KEY 값을 채웁니다
```

백엔드 함수까지 함께 로컬에서 돌리려면 Vercel CLI를 사용합니다:

```bash
npm i -g vercel
vercel dev
```

> `npm run dev`(Vite만 실행)로는 `/api/polish` 백엔드가 뜨지 않습니다.
> 백엔드까지 테스트하려면 `vercel dev`를 쓰세요.

---

## 2. GitHub에 올리기

1. https://github.com 에서 새 저장소(repository)를 만듭니다.
2. 이 폴더에서 아래를 실행합니다(또는 GitHub 웹의 "Upload files"로 업로드):

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<본인계정>/<저장소이름>.git
git push -u origin main
```

> `.gitignore`가 `node_modules`와 `.env`를 제외하므로 API 키는 깃헙에 올라가지 않습니다.

---

## 3. Vercel로 배포하기 (실제 주소 만들기)

1. https://vercel.com 에 GitHub 계정으로 로그인합니다.
2. "Add New → Project"에서 위에서 올린 저장소를 가져옵니다(Import).
3. **Environment Variables**에 키를 추가합니다:
   - `ANTHROPIC_API_KEY` = 본인 API 키
   - (선택) `ANTHROPIC_MODEL` = 사용할 모델명
4. "Deploy"를 누르면 `https://<프로젝트>.vercel.app` 주소가 생성됩니다.

이 주소를 팀원들에게 공유하면 누구나 브라우저에서 바로 쓸 수 있습니다.

---

## 모델명 변경

사용 가능한 최신 모델명은 공식 문서에서 확인하세요:
https://docs.claude.com/en/docs/about-claude/models

`ANTHROPIC_MODEL` 환경변수로 바꿀 수 있습니다.

---

## 다음 단계 아이디어

- **팀 공용 용어집**: 지금은 용어집이 브라우저별로 저장됩니다. 팀 전체가
  같은 용어집을 공유하려면 데이터베이스(예: Vercel KV, Supabase)가 필요합니다.
- 용어 카테고리(버튼/에러/공통) 분류, 용어집 내보내기/가져오기 등.
