# regulation-system

규정관리시스템 — Regulation Management System

## 🚀 시작하기

### 1. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 만드세요.
2. `js/config.js` 파일을 열고 **플레이스홀더 값**을 실제 프로젝트 값으로 교체하세요:

```js
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_KEY = 'your_supabase_anon_key_here';
```

> ⚠️ **주의:** 실제 API 키를 커밋하지 마세요. 키가 포함된 `js/config.js`는 버전 관리에서 제외하거나, `.gitignore`에 추가된 별도 설정 파일을 사용하세요.

3. `.env.example`을 참고하여 로컬 개발 환경 설정 방법을 확인하세요.

---

## 🔒 보안 설정

### API 키 관리
- **절대로** 실제 Supabase URL 또는 API 키를 소스 코드에 직접 커밋하지 마세요.
- `.env.example`을 복사하여 `.env` 파일을 만들고 실제 값을 입력하세요.
- `.env` 파일은 `.gitignore`에 의해 버전 관리에서 제외됩니다.
- Supabase의 **Row Level Security (RLS)**를 반드시 활성화하여 데이터를 보호하세요.

### Supabase Row Level Security
Supabase 대시보드에서 `regulations` 테이블에 RLS 정책을 설정하세요:
- **읽기(SELECT):** 모든 사용자 허용 (공개 데이터)
- **쓰기(INSERT/UPDATE/DELETE):** 인증된 사용자(관리자)만 허용

### 관리자 계정
- Supabase Authentication에서 관리자 이메일 계정을 등록하세요.
- 강력한 비밀번호를 사용하세요.
- 불필요한 계정은 즉시 삭제하세요.
