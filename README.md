# UX 라이팅 정리기

아무 텍스트나 넣으면 UX 라이팅 모범 사례에 맞춰 다듬어 주는 웹앱입니다.
한국어·영어를 자동으로 인식하고, 등록한 용어집(권장/피할 표현)을 반영합니다.

## 구성

- **프론트엔드**: React + Vite (`src/`)
- **백엔드**: Vercel 서버리스 함수 (`api/polish.js`) — Google Gemini API를
  서버에서만 호출해 API 키가 외부에 노출되지 않도록 합니다.
- **저장**: 용어집은 브라우저(localStorage)에 저장

---

## 1. Google Gemini API 키 발급 (무료 등급 사용 가능)

1. https://aistudio.google.com 에 구글 계정으로 로그인합니다.
2. "Get API key"(API 키 가져오기)에서 키를 발급합니다.
3. 발급된 키를 복사해 둡니다. (이 키는 절대 공개된 곳에 올리지 마세요.)

> 무료 등급은 분당/일당 요청 수 등에 제한이 있고, 데이터 사용 정책이
> 유료와 다를 수 있습니다. 최신 조건은 https://ai.google.dev 에서 확인하세요.

---

## 2. 로컬에서 실행하기

필요한 것: Node.js 18 이상

```bash
npm install
cp .env.example .env   # .env 파일을 열어 GEMINI_API_KEY 값을 채웁니다
```

백엔드 함수까지 함께 로컬에서 돌리려면 Vercel CLI를 사용합니다:

```bash
npm i -g vercel
vercel dev
```

> `npm run dev`(Vite만 실행)로는 `/api/polish` 백엔드가 뜨지 않습니다.

---

## 3. GitHub에 올리기 / 업데이트하기

이미 저장소가 있다면, 바뀐 파일만 다시 올리면 됩니다.

- **웹에서**: 저장소에서 바뀐 파일(`api/polish.js`, `.env.example`, `README.md`)을
  열고 연필 아이콘으로 수정하거나, "Add file → Upload files"로 덮어쓴 뒤 커밋합니다.
- **명령줄에서**:

```bash
git add .
git commit -m "switch backend to Gemini"
git push
```

> `.gitignore`가 `.env`를 제외하므로 API 키는 깃헙에 올라가지 않습니다.

---

## 4. Vercel로 배포하기

1. https://vercel.com 에 GitHub 계정으로 로그인합니다.
2. "Add New → Project"에서 저장소를 가져옵니다(Import).
3. **Environment Variables**에 키를 추가합니다:
   - `GEMINI_API_KEY` = 본인 Gemini API 키
   - (선택) `GEMINI_MODEL` = 사용할 모델명
4. "Deploy"를 누르면 `https://<프로젝트>.vercel.app` 주소가 생성됩니다.

> 이미 Vercel에 연결돼 있다면, 깃헙에 푸시하면 자동으로 다시 배포됩니다.
> 단, 환경 변수 이름이 `ANTHROPIC_API_KEY`에서 `GEMINI_API_KEY`로 바뀌었으니
> Vercel 프로젝트 Settings → Environment Variables에서 새 키를 추가하고
> 다시 배포(Redeploy)하세요.

---

## 모델명 변경

사용 가능한 모델명은 https://ai.google.dev/gemini-api/docs/models 에서 확인하고,
`GEMINI_MODEL` 환경변수로 바꿀 수 있습니다.

---

## 다음 단계 아이디어

- **팀 공용 용어집**: 지금은 용어집이 브라우저별로 저장됩니다. 팀 전체가
  같은 용어집을 공유하려면 데이터베이스(예: Vercel KV, Supabase)가 필요합니다.
- 용어 카테고리(버튼/에러/공통) 분류, 용어집 내보내기/가져오기 등.
