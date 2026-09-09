package com.codearena.judge.store;

public record TestCaseRecord(
        Long id,
        String input,
        String expectedOutput,
        boolean hidden,
        int points,
        int orderIndex
) {}
