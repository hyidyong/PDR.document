# Supabase AI Edge contracts pending confirmation

The application does not infer either deployed function's JSON contract. Confirm the following with the function owner before enabling the prepared checklist call in the UI.

## `analyze-expense-hj-v2`

- Confirm the request field for the Storage object path (`filePath` in the current client).
- Confirm whether the response contains top-level normalized expense fields, `review`, or both.
- For `review`, confirm `verdict` values and every `findings` field, especially rule ID, message, page, evidence ID, and location.
- Confirm page-count or analyzed-page metadata so a 10-page run can be verified.
- Confirm stable rule IDs for the five target findings.
- Confirm error body fields and whether `sb-error-code` is set by the Gateway.
- Confirm maximum PDF bytes and execution timeout. The Spring service currently skips AI above 4,000,000 bytes.

The selected function is controlled by `SUPABASE_AI_FUNCTION`. Use `analyze-expense-hj-v2` for v2 and `analyze-expense-hj` for rollback.

## `generate-document-checklist`

- Confirm accepted input variants: announcement text, file reference, or both.
- Confirm input field names, required fields, maximum text/file size, and supported file types.
- Confirm the exact shape and nullability of `items`, `sourceUrl`, `verification`, and `webSearchUsed`.
- Confirm whether sources belong to the whole response or to individual items.
- Confirm item fields for document name, issuer, issuance method, evidence, and uncertainty.
- Confirm refusal, partial-result, web-search failure, and general error responses.
- Confirm whether URLs are always HTTPS and whether more than one source can be returned.

Until this is confirmed, Spring and React use a schema-neutral JSON transport and the existing checklist screen remains on mock data. Do not log request or response bodies because they may contain personal data or document text.
