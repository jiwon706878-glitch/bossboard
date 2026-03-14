# BossBoard Agent Team — 빠른 참조 카드

## 🎯 한 줄 요약
BossBoard = "사장님의 AI 운영 관제탑. 팀 매뉴얼부터 일일 체크리스트까지."

---

## 👥 6명 에이전트 역할

```
┌─────────────────────────────────────────────────┐
│                 TEAM LEAD                        │
│         (작업 분배 + 조율 + 통합)                  │
└──────────┬───────────┬──────────┬───────────────┘
           │           │          │
     ┌─────┴─────┐ ┌───┴───┐ ┌───┴─────┐
     │ Agent 1   │ │ Ag. 3 │ │ Agent 6 │
     │ DB Arch.  │ │Landing│ │ Auth    │
     └─────┬─────┘ └───────┘ └─────────┘
           │ (스키마 완성 후)
     ┌─────┴─────┐
     │ Agent 2   │
     │ Backend   │
     └──┬────┬───┘
        │    │ (API 완성 후)
   ┌────┴┐ ┌─┴─────┐
   │Ag.4 │ │Ag. 5  │
   │Dash │ │SOP UI │
   └─────┘ └───────┘
```

## 📁 각 에이전트 담당 디렉토리

| Agent | 담당 디렉토리 | 절대 건드리면 안 되는 곳 |
|-------|-------------|---------------------|
| 1. DB | `/supabase/`, `/types/`, `/lib/supabase.ts` | UI 파일 전부 |
| 2. API | `/app/api/` | UI 파일 전부 |
| 3. Landing | `/app/(marketing)/` | `/app/api/`, `/supabase/` |
| 4. Dashboard | `/app/(dashboard)/`, `/components/dashboard/` | `/app/api/`, `/supabase/` |
| 5. SOP | `/app/(sops)/`, `/components/sop/` | `/app/api/`, `/supabase/` |
| 6. Auth | `/app/(auth)/`, `/app/(settings)/` | `/app/(sops)/`, `/app/(dashboard)/` |

---

## 🏃 실행 순서

### Step 1: 프로젝트 준비 (네가 직접)
```bash
cd ~/your-bossboard-project
git checkout -b backup/pre-pivot
git add -A && git commit -m "backup: pre-pivot"
git checkout -b feature/pivot-to-ops-wiki
```

### Step 2: CLAUDE.md 복사 (네가 직접)
```bash
# 제공된 CLAUDE.md 파일을 프로젝트 루트에 복사
cp ~/path/to/CLAUDE.md ./CLAUDE.md
```

### Step 3: Agent Teams 활성화 (네가 직접)
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true
```

### Step 4: Claude Code 실행 + 팀 시작 (여기서부터 AI)
```bash
claude
```
그리고 AGENT_TEAM_SETUP.md에 있는 프롬프트를 붙여넣기.

---

## 🎨 핵심 UI 화면 명세

### 1. 랜딩페이지 (Agent 3)
```
[Nav] Logo | Features | Pricing | Login | Get Started Free

[Hero]
"사장님의 AI 운영 관제탑"
"팀 매뉴얼을 AI가 만들고, 매일 체크리스트로 실행합니다"
[Get Started Free 버튼]   [데모 영상 버튼]

[3 Feature Cards]
🤖 AI SOP 생성     📊 운영 대시보드     👥 팀 온보딩
30초만에 매뉴얼 완성  매일 아침 현황 확인    신입도 즉시 전력화

[Pricing Table]
Free / Starter $19 / Pro $49 / Business $129

[CTA]
"5분이면 첫 SOP가 완성됩니다. 무료로 시작하세요."

[Footer]
```

### 2. 메인 대시보드 (Agent 4)
```
[Sidebar]
📊 대시보드 (현재)
📖 SOP 위키
✅ 체크리스트 (Month 2)
👥 팀
⚙️ 설정

[Main Area]
"좋은 아침이에요, {name}님!"

[Card Grid]
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 📖 SOP 현황  │ │ 👥 팀 현황   │ │ 💡 AI 인사이트│
│ 전체: 12개   │ │ 멤버: 5명    │ │ 3개 SOP     │
│ 최신: 10개   │ │ 신입 온보딩중 │ │ 업데이트 필요 │
│ 리뷰필요: 2  │ │ 1명          │ │             │
└─────────────┘ └─────────────┘ └─────────────┘

[최근 활동]
• 김민수가 "오픈 절차" SOP를 읽었습니다 (2시간 전)
• "클레임 대응" SOP가 업데이트되었습니다 (어제)
• 박서연이 팀에 합류했습니다 (3일 전)
```

### 3. SOP 생성 페이지 (Agent 5)
```
[Step 1: 입력]
"어떤 업무 매뉴얼을 만들까요?"
┌─────────────────────────────────┐
│ 예: 카페 오픈 절차, 반품 처리,   │
│     신입 온보딩, 장비 점검 ...    │
└─────────────────────────────────┘

[카테고리 선택]
운영 | 안전 | 온보딩 | CS | 기타

[AI로 생성하기 버튼]

[Step 2: AI 생성 결과]
--- 생성된 SOP 프리뷰 ---
제목: 카페 오픈 절차
목적: ...
단계:
1. ...
2. ...
3. ...
체크리스트: ...
--------------------------

[편집하기] [바로 배포] [다시 생성]

[Step 3: 배포]
"SOP가 위키에 추가되었습니다! 팀에게 알림을 보낼까요?"
[팀에게 알리기] [나중에]
```

---

## ⚡ Day 1 집중 목표

에이전트 6명이 동시에 작업하면 Day 1에 이것까지 나와야 해:

```
✅ Supabase 테이블 전부 생성 (Agent 1)
✅ 랜딩페이지 80% (Agent 3)
✅ 로그인/회원가입 동작 (Agent 6)
✅ /api/ai/generate 동작 — 텍스트 입력하면 SOP 나옴 (Agent 2)
✅ SOP 생성 페이지 기본 동작 (Agent 5)
✅ 대시보드 레이아웃 + 사이드바 (Agent 4)
```

이게 Day 1에 되면, Day 2-3에 통합하고,
Day 4-5에 폴리시 + 배포하면 **5일 안에 MVP 런칭 가능.**
