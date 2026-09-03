# How-To: Add a New REST API Endpoint

Follow this step-by-step guide to add a new API endpoint while adhering to TaskFlow's modular architecture standards.

---

## 1. Define the Request & Response DTOs
Create your DTOs in `services/backend/src/main/java/com/taskflow/<domain>/dto/`:
```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateItemRequest {
    @NotBlank(message = "Title is required")
    private String title;
}
```

## 2. Add Business Logic in Service
In `services/backend/src/main/java/com/taskflow/<domain>/service/<Domain>Service.java`:
```java
@Transactional
public ItemResponse createItem(UUID workspaceId, CreateItemRequest request) {
    // 1. Validate workspace and permissions
    // 2. Perform business logic
    // 3. Persist entity
    // 4. Return mapped response DTO
}
```

## 3. Expose via REST Controller
In `services/backend/src/main/java/com/taskflow/<domain>/controller/<Domain>Controller.java`:
```java
@PostMapping("/workspaces/{workspaceId}/items")
public ResponseEntity<ApiResponse<ItemResponse>> createItem(
        @PathVariable UUID workspaceId,
        @Valid @RequestBody CreateItemRequest request) {
    ItemResponse response = itemService.createItem(workspaceId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
}
```

## 4. Add Typed Client in Frontend
In `apps/web/src/lib/api/<domain>-api.ts`:
```typescript
export const itemApi = {
  createItem: (workspaceId: string, data: CreateItemRequest) =>
    apiClient.post<ItemResponse>(`/api/v1/workspaces/${workspaceId}/items`, data),
}
```
