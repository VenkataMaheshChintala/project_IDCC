package com.codearena.judge.comparator;

/**
 * Strategy interface for comparing judge output.
 * Allows future special judges (e.g., floating point tolerance, checker programs).
 */
public interface OutputComparator {
    boolean matches(String expected, String actual);
}
