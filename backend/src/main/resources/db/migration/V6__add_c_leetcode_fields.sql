-- V6__add_c_leetcode_fields.sql
-- Add LeetCode style code editor support for C language to problems table

ALTER TABLE problems
ADD COLUMN c_starter_code TEXT,
ADD COLUMN c_runner_code TEXT;

-- Two Sum (Problem 1)
UPDATE problems
SET c_starter_code = 'int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    
}',
c_runner_code = '#include <stdio.h>
#include <stdlib.h>

int* twoSum(int* nums, int numsSize, int target, int* returnSize);

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) {
        scanf("%d", &nums[i]);
    }
    
    int target;
    scanf("%d", &target);
    
    int returnSize = 0;
    int* result = twoSum(nums, n, target, &returnSize);
    
    if (result == NULL || returnSize == 0) {
        printf("null\n");
    } else {
        for (int i = 0; i < returnSize; i++) {
            printf("%d%s", result[i], (i < returnSize - 1) ? " " : "");
        }
        printf("\n");
        free(result);
    }
    free(nums);
    return 0;
}'
WHERE id = 1;

-- Maximum Subarray (Problem 2)
UPDATE problems
SET c_starter_code = 'int maxSubArray(int* nums, int numsSize) {
    
}',
c_runner_code = '#include <stdio.h>
#include <stdlib.h>

int maxSubArray(int* nums, int numsSize);

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) {
        scanf("%d", &nums[i]);
    }
    
    int result = maxSubArray(nums, n);
    printf("%d\n", result);
    
    free(nums);
    return 0;
}'
WHERE id = 2;

-- Number of Islands (Problem 3)
UPDATE problems
SET c_starter_code = 'int numIslands(char** grid, int gridSize, int* gridColSize) {
    
}',
c_runner_code = '#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int numIslands(char** grid, int gridSize, int* gridColSize);

int main() {
    int m, n;
    if (scanf("%d %d", &m, &n) != 2) return 0;
    
    char** grid = (char**)malloc(m * sizeof(char*));
    int* gridColSize = (int*)malloc(m * sizeof(int));
    
    for (int i = 0; i < m; i++) {
        grid[i] = (char*)malloc((n + 1) * sizeof(char));
        scanf("%s", grid[i]);
        gridColSize[i] = n;
    }
    
    int result = numIslands(grid, m, gridColSize);
    printf("%d\n", result);
    
    for (int i = 0; i < m; i++) free(grid[i]);
    free(grid);
    free(gridColSize);
    
    return 0;
}'
WHERE id = 3;
