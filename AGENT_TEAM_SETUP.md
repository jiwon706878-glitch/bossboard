# BossBoard — Claude Code Agent Teams 세팅 가이드

## 📋 시작 전 체크리스트

### 1. Claude Code 버전 확인
```bash
claude --version
# v2.1.32 이상이어야 Agent Teams 사용 가능
# 아니면: npm update -g @anthropic-ai/claude-code
```

### 2. Agent Teams 활성화
```bash
# 방법 1: 환경변수
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true

# 방법 2: settings.json에 추가
# ~/.claude/settings.json 에 아래 추가:
# { "experimental": { "agentTeams": true } }
```

### 3. 프로젝트 초기 세팅
```bash
# 기존 BossBoard 프로젝트 폴더로 이동
cd ~/bossboard  # (실제 경로로 변경)

# CLAUDE.md 파일을 프로젝트 루트에 복사
# (이 가이드와 함께 제공된 CLAUDE.md 파일)

# 의존성 확인
node --version  # v18+
npm --version
```

### 4. 기존 코드 백업
```bash
# 중요! 피봇 전 현재 상태 백업
git checkout -b backup/pre-pivot
git add -A && git commit -m "backup: pre-pivot state"
git checkout main
```

---

## 🚀 Agent Team 실행

### Claude Code를 열고 아래 프롬프트를 입력:

```
BossBoard를 AI 운영 관제탑(Operations Control Tower)으로 피봇합니다.
핵심 기능: AI SOP 자동 생성 + 사장님 대시보드 + 팀 위키

6명의 에이전트 팀을 구성해서 병렬로 작업해주세요:

Agent 1 — DB Architect:
- CLAUDE.md의 스키마대로 Supabase 테이블 생성
- RLS(Row Level Security) 정책 설정
- workspace_id 기반 멀티테넌시 설정
- 기존 BossBoard 테이블 중 재활용 가능한 것 확인

Agent 2 — Backend API:
- /api/ai/generate — Claude API 연동 SOP 생성 엔드포인트
- /api/sops/ — SOP CRUD (생성, 조회, 수정, 삭제, 목록)
- /api/team/ — 팀원 초대, 권한 관리
- /api/sops/[id]/read — 읽음 확인 기록
- Supabase 서버 클라이언트 사용

Agent 3 — Landing Page:
- mybossboard.com 메인 랜딩페이지 완전 리뉴얼
- 히어로: "사장님의 AI 운영 관제탑" 메시지
- 핵심 기능 3가지 소개 (AI SOP 생성, 대시보드, 팀 위키)
- 가격표 섹션 (Free/Starter/Pro/Business)
- CTA: 무료로 시작하기
- 반응형, shadcn/ui + Tailwind
- 디자인: Linear/Notion 스타일로 클린하고 프로페셔널

Agent 4 — Dashboard UI:
- /(dashboard) 메인 대시보드 페이지
- "오늘의 현황" 카드: 체크리스트 완료율, SOP 현황, 팀 현황
- AI 인사이트 카드: "업데이트 필요한 SOP" 알림
- 최근 활동 피드
- 반응형 사이드바 네비게이션

Agent 5 — SOP Engine:
- /(sops) SOP 목록 페이지 (검색, 필터, 카테고리)
- /(sops)/new SOP 생성 페이지 — AI 생성 폼 + 결과 에디터
- /(sops)/[id] SOP 상세 보기 (위키 스타일)
- /(sops)/[id]/edit SOP 편집 (TipTap 에디터)
- AI SOP 생성 플로우: 업종 선택 → 주제 입력 → AI 생성 → 편집 → 배포

Agent 6 — Auth & Team:
- 로그인/회원가입 (Supabase Auth)
- 온보딩 위자드 (이름, 회사명, 업종 선택, 첫 SOP 생성)
- 팀원 초대 플로우
- 워크스페이스 설정 페이지
- 기존 Paddle 결제 연동 확인/수정

각 에이전트는 서로 다른 파일/디렉토리에서 작업하여 충돌을 피하세요.
CLAUDE.md를 읽고 스키마, 디자인 시스템, 컨벤션을 따르세요.
```

---

## ⚠️ 주의사항

### 충돌 방지를 위한 파일 분리

```
Agent 1 (DB):        /supabase/migrations/
Agent 2 (API):       /app/api/
Agent 3 (Landing):   /app/(marketing)/
Agent 4 (Dashboard): /app/(dashboard)/
Agent 5 (SOP):       /app/(sops)/ + /components/sop/
Agent 6 (Auth):      /app/(auth)/ + /app/(settings)/
```

### 공유 파일 규칙
- `/lib/supabase.ts` — Agent 1이 먼저 생성, 나머지가 import
- `/components/ui/` — shadcn/ui 컴포넌트는 Agent 3이 설치, 나머지가 사용
- `/types/` — Agent 1이 TypeScript 타입 정의, 나머지가 import

### 작업 순서 의존성
```
Agent 1 (DB) ──────→ Agent 2 (API) ──────→ Agent 4 (Dashboard)
    │                    │                       │
    │                    └──→ Agent 5 (SOP) ─────┘
    │
    └──→ Agent 6 (Auth)
    
Agent 3 (Landing) → 독립적, 다른 에이전트와 의존성 없음
```

Agent 1(DB)과 Agent 3(Landing)이 먼저 시작.
Agent 2(API)는 Agent 1의 스키마가 완성된 후 시작.
Agent 4, 5는 Agent 2의 API가 기본 형태를 갖춘 후 연결.

---

## 🔧 에이전트 실행 중 문제 해결

### 토큰 사용량이 너무 높을 때
```
# 특정 에이전트만 중단하고 나머지 계속
# Team Lead에게: "Agent 3을 일시 중지하고 나머지 계속 진행해줘"
```

### 파일 충돌 발생 시
```
# Git worktree 사용 추천
git worktree add ../bossboard-agent1 -b agent1
git worktree add ../bossboard-agent2 -b agent2
# ... 각 에이전트가 별도 브랜치에서 작업 후 머지
```

### 에이전트가 CLAUDE.md를 안 따를 때
```
# 프롬프트에 명시적으로 추가:
"CLAUDE.md를 다시 읽고, 거기 정의된 스키마/디자인/컨벤션을 정확히 따라주세요."
```

---

## 📊 진행 상황 체크포인트

### Day 1 완료 목표
- [ ] DB 스키마 생성 완료 (Agent 1)
- [ ] 랜딩페이지 기본 구조 (Agent 3)
- [ ] Auth 플로우 동작 (Agent 6)
- [ ] API 라우트 기본 구조 (Agent 2)

### Day 2 완료 목표
- [ ] AI SOP 생성 API 동작 (Agent 2)
- [ ] SOP 생성 UI 동작 (Agent 5)
- [ ] 대시보드 기본 레이아웃 (Agent 4)
- [ ] 랜딩페이지 완성 (Agent 3)

### Day 3 완료 목표
- [ ] SOP 목록/상세/편집 완성 (Agent 5)
- [ ] 대시보드 데이터 연결 (Agent 4)
- [ ] 팀 초대 플로우 (Agent 6)
- [ ] 전체 통합 테스트

### Day 4-5 완료 목표
- [ ] 결제 연동 확인 (Paddle)
- [ ] 버그 수정 + 폴리시
- [ ] Vercel 배포
- [ ] 실제 도메인 연결

---

## 🚀 배포 체크리스트

### Vercel
```bash
vercel --prod
# 환경변수 설정:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# ANTHROPIC_API_KEY
# PADDLE_API_KEY (기존 것)
# RESEND_API_KEY
```

### Supabase
- Production 프로젝트 확인
- RLS 정책 활성화 확인
- Edge Functions (필요시)

### 도메인
- mybossboard.com → Vercel 연결
- SSL 자동 설정 확인
