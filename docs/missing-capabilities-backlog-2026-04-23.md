# Missing Capabilities Backlog

Ngày rà soát: `2026-04-23`

Ghi chú:
- Backlog này chỉ nói về `capability gaps` còn thiếu hoặc còn lệch giữa host/runtime.
- Các mục đang có agent khác implement đã được bỏ khỏi plan chính bên dưới.
- Pivot parity phần còn thiếu và Google Sheets chart parity đã được triển khai trong pass này.
- Capability matrix của planner đã được sync với host support thật trong pass này.
- Helper-sheet scaffolding đã có generic guidance seeding trong pass này.
- Undo / redo exact-safe hiện đã có cho subset `single target-range writes` khi host giữ được rollback snapshot cục bộ.

## 1. Range Transfer Parity

**capability**

Mở rộng `range_transfer_plan` để parity hơn giữa 2 host và giảm các fail-closed exact-safe.

**host nào thiếu**

- Google Sheets: thiếu nhiều hơn
- Excel: còn vài restriction exact-safe

**root cause**

- Google Sheets hiện chỉ support transfer modes `values` và `formulas`; `formats` và các paste modes khác chưa parity.
- Excel vẫn chặn một số overlapping/formula/format append situations và exact-safe append expansion cases.
- Hai host cùng có transfer engine, nhưng capability matrix khác nhau đáng kể nên approval/completion path phải xử lý nhiều ngoại lệ.

**độ khó**

`Medium`

**thứ tự nên làm**

`1`

## 2. Cleanup Parity Cho Các Case Có Formula Hoặc Multi-Range Side Effects

**capability**

Mở rộng exact-safe cleanup cho các operation còn fail-closed khi target range có formulas hoặc khi mutation không chỉ là một rectangle writeback đơn giản.

**host nào thiếu**

- Excel
- Google Sheets

**root cause**

- `normalize_case upper/lower/title` và `standardize_format` exact-safe đã có trên cả hai host, nhưng các cleanup operation còn lại vẫn fail-closed khi range chứa formulas mà op không formula-aware.
- Các op như `remove_blank_rows`, `remove_duplicate_rows`, `split_column`, `join_columns`, `fill_down` vẫn phụ thuộc vào raw matrix mutation và chưa có rollback/semantic adapter tốt cho những workbook phức tạp.
- Một số cleanup op có side effects logic lớn hơn một target rectangle đơn thuần, nên khó đưa vào reversible subset hiện tại.

**độ khó**

`Medium`

**thứ tự nên làm**

`2`

## 3. Broader Reversible Execution Coverage

**capability**

Mở rộng undo / redo exact-safe ra ngoài subset hiện tại là `single target-range writes`.

**host nào thiếu**

- Excel
- Google Sheets

**root cause**

- Hiện rollback thật chỉ có cho các execution giữ được snapshot cục bộ của một target range duy nhất, ví dụ `sheet_update`, `sheet_import_plan`, `range_sort_plan`, `data_cleanup_plan`, `analysis_report_plan` materialized.
- Workbook structure updates, filters, validations, named ranges, transfers có source+target side effects, conditional formatting, và composite workflows vẫn chưa có control-plane rollback exact-safe.
- Để mở rộng thêm, cần snapshot/inverse-plan model tốt hơn ở host và một handshake chắc hơn với gateway control routes.

**độ khó**

`Medium-High`

**thứ tự nên làm**

`3`

## Khuyến nghị thứ tự tổng

Đang có agent khác implement:
- Chart creation thật cho Excel host
- Filter / validation / named-range parity
- `standardize_format` exact-safe cho cả 2 host
- Conditional formatting parity

Plan chính còn lại:
1. Range transfer parity
2. Cleanup parity cho các case có formula hoặc multi-range side effects
3. Broader reversible execution coverage
