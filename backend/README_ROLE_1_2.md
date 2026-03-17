# 역할 1, 2 작업 정리 README

이 문서는 내가 맡은 작업인 아래 2가지를 기준으로, **어느 파일의 어디를 고쳤는지**를 다시 봐도 이해되게 정리한 문서다.

1. `[BE] 절감액 계산 로직 구현`
2. `[BE] 더미 리소스 데이터셋 정의`
3. `[BE] CPU 기반 낭비 판단 로직 구현`

---

## 0) 이번 작업 상태 한눈에 보기

1. 더미 리소스 데이터셋 정의: **완료**
2. 절감액 계산 로직 구현: **완료**
3. CPU 기반 낭비 판단 로직 구현: **완료(초기 규칙 기반)**

설명:
- 3번은 ML/통계 모델이 아니라, 현재는 CPU 구간 규칙으로 낭비를 판단하는 **1차 버전**이다.
- 추후 실제 AWS 연동 데이터가 쌓이면 규칙/가중치를 고도화하면 된다.

---

## 1) 전체 변경 파일 목록

### 새로 만든 파일
- `src/main/resources/data.sql`
- `src/main/java/com/jeolgamai/backend/domain/recommend/service/SavingsCalculator.java`

### 수정한 파일
- `src/main/resources/application-local.yml`
- `src/main/java/com/jeolgamai/backend/domain/metric/repository/MetricRepository.java`
- `src/main/java/com/jeolgamai/backend/domain/cost/repository/CostRepository.java`
- `src/main/java/com/jeolgamai/backend/domain/recommend/service/RecommendService.java`
- `src/main/java/com/jeolgamai/backend/domain/recommend/controller/RecommendController.java`

---

## 2) 파일별 상세 변경 내용

## A. 더미 데이터셋 정의

### 파일: `src/main/resources/data.sql`

### 어디를 고쳤나?
- 파일을 새로 생성.
- 아래 순서로 SQL 작성:
1. 기존 데이터 초기화 (`DELETE`)
2. `resources` 더미 insert
3. `metrics` 더미 insert
4. `costs` 더미 insert

### 왜 이렇게 했나?
- 추천 계산은 `resource + metric + cost`가 같이 있어야 동작한다.
- CPU가 낮은 케이스/중간 케이스/높은 케이스를 모두 넣어서 계산 결과가 다양하게 나오게 했다.

---

## B. 더미 데이터 자동 로딩 설정

### 파일: `src/main/resources/application-local.yml`

### 어디를 고쳤나?
- `spring.jpa.hibernate.ddl-auto: update` 추가
- `spring.jpa.defer-datasource-initialization: true` 추가
- `spring.sql.init.mode: always` 추가

### 왜 이렇게 했나?
- 앱 실행 시 테이블을 먼저 준비하고,
- 그 다음 `data.sql`이 자동으로 실행되게 하기 위해서다.

---

## C. 절감액 계산 로직 추가

### 파일: `src/main/java/com/jeolgamai/backend/domain/recommend/service/SavingsCalculator.java`

### 어디를 고쳤나?
- 파일 새로 생성.
- 핵심 메서드:
1. `calculateEstimatedSavings(double monthlyCost, double cpuAvg)`
2. `getSavingsRatio(double cpuAvg)`

### 계산 규칙
1. CPU < 20% -> 월비용의 40%
2. CPU 20~40% -> 월비용의 20%
3. CPU > 40% -> 월비용의 5%

### 왜 이렇게 했나?
- 초기 버전에서는 이해하기 쉬운 규칙 기반이 유지보수에 유리하다.
- 나중에 실제 AWS 데이터 기반 모델로 교체하기 쉽다.

---

## D. 리소스별 최신 metric/cost 조회 메서드 추가

### 파일: `src/main/java/com/jeolgamai/backend/domain/metric/repository/MetricRepository.java`

### 어디를 고쳤나?
- 메서드 추가:
- `Optional<Metric> findFirstByResourceIdOrderByIdDesc(Long resourceId);`

### 파일: `src/main/java/com/jeolgamai/backend/domain/cost/repository/CostRepository.java`

### 어디를 고쳤나?
- 메서드 추가:
- `Optional<Cost> findFirstByResourceIdOrderByIdDesc(Long resourceId);`

### 왜 이렇게 했나?
- 추천 자동생성 시 특정 리소스의 최신 수치(메트릭/비용) 1건만 가져와 계산하려고 추가했다.

---

## E. 추천 자동 생성 서비스 로직 추가

### 파일: `src/main/java/com/jeolgamai/backend/domain/recommend/service/RecommendService.java`

### 어디를 고쳤나?
- 의존성 필드 추가:
1. `MetricRepository`
2. `CostRepository`
3. `SavingsCalculator`

- 메서드 추가:
1. `generateFromResource(Long resourceId)`  
   - resource 조회  
   - metric/cost 최신값 조회  
   - 절감액 계산  
   - risk/feasibility/priority 계산  
   - recommendation 저장

- 보조 메서드 추가:
1. `calculateRiskScore(...)`
2. `calculateFeasibilityScore(...)`
3. `calculatePriorityScore(...)`
4. `roundToTwoDecimals(...)`
5. `clamp(...)`

### 왜 이렇게 했나?
- 기존 `create(...)`는 사용자가 값을 모두 넣어야 해서 자동 계산이 안 된다.
- `generateFromResource(...)`를 추가해 리소스 ID만으로 추천 생성이 가능해졌다.

---

## F. 추천 자동 생성 API 추가

### 파일: `src/main/java/com/jeolgamai/backend/domain/recommend/controller/RecommendController.java`

### 어디를 고쳤나?
- 엔드포인트 추가:
- `POST /api/recommendations/generate/{resourceId}`

- 연결 메서드:
- `generateByResource(@PathVariable Long resourceId)`

### 왜 이렇게 했나?
- 프론트/테스터가 리소스 ID만으로 바로 추천 생성 API를 호출할 수 있게 하려고 추가했다.

---

## 3) 실행/확인 방법

1. DB 실행 (`backend` 폴더에서)
```bash
docker compose up -d
```

2. 서버 실행
```bash
./gradlew bootRun
```

또는 로컬 env 파일을 두고 실행
```bash
cp .env.local.example .env.local
bash scripts/run-local-backend.sh
```

3. 자동 추천 생성 호출
```bash
POST /api/recommendations/generate/1
```

4. 생성 결과 조회
```bash
GET /api/recommendations
```

---

## 4) 현재 상태 메모

- `compileJava`는 성공.
- `test`의 `contextLoads`는 로컬 DB 환경 설정 영향으로 실패 가능.
- 즉, 코드 변경 자체는 컴파일 기준으로 정상 반영됨.

---

## 5) LLM 키 관리

- `GMS_API_KEY`는 코드에 하드코딩하지 말고 `backend/.env.local` 또는 systemd `EnvironmentFile`로 관리한다.
- CI/CD에서는 GitLab masked variable `GMS_KEY`로 관리하고, 파이프라인이 Kubernetes Secret `backend-runtime-secrets`를 갱신하도록 둔다.
- 로컬 실행:
```bash
cp .env.local.example .env.local
vi .env.local
bash scripts/run-local-backend.sh
```
- systemd 예시:
  - 서비스 파일 템플릿: `deploy/systemd/jeolgamai-backend.service.example`
  - 환경 파일 템플릿: `deploy/systemd/backend.env.example`
- GitLab CI/CD 예시:
  - 필수 변수: `GMS_KEY`, `KUBE_CONFIG_B64`
  - 선택 변수: `CONNECTOR_ENCRYPTION_KEY`, `BACKEND_RUNTIME_SECRET_NAME`, `BACKEND_RUNTIME_SECRET_NAMESPACE`
  - 잡 위치: `.gitlab-ci.yml` 의 `sync_backend_runtime_secret`
