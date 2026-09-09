-- V4__add_leetcode_style_fields.sql
-- Add LeetCode style code editor support to problems table

ALTER TABLE problems
ADD COLUMN starter_code TEXT,
ADD COLUMN runner_code TEXT;

-- Two Sum (Problem 1)
UPDATE problems
SET starter_code = 'class Solution {
    public int[] twoSum(int[] nums, int target) {
        
    }
}',
runner_code = 'import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }
        int target = sc.nextInt();
        
        Solution solution = new Solution();
        int[] result = solution.twoSum(nums, target);
        
        if (result == null) {
            System.out.println("null");
        } else {
            for (int i = 0; i < result.length; i++) {
                System.out.print(result[i] + (i < result.length - 1 ? " " : ""));
            }
            System.out.println();
        }
    }
}'
WHERE id = 1;

-- Maximum Subarray (Problem 2)
UPDATE problems
SET starter_code = 'class Solution {
    public int maxSubArray(int[] nums) {
        
    }
}',
runner_code = 'import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }
        
        Solution solution = new Solution();
        int result = solution.maxSubArray(nums);
        System.out.println(result);
    }
}'
WHERE id = 2;

-- Number of Islands (Problem 3)
UPDATE problems
SET starter_code = 'class Solution {
    public int numIslands(char[][] grid) {
        
    }
}',
runner_code = 'import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int m = sc.nextInt();
        int n = sc.nextInt();
        char[][] grid = new char[m][n];
        for (int i = 0; i < m; i++) {
            String row = sc.next();
            grid[i] = row.toCharArray();
        }
        
        Solution solution = new Solution();
        int result = solution.numIslands(grid);
        System.out.println(result);
    }
}'
WHERE id = 3;
