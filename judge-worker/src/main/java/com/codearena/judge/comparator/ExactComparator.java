package com.codearena.judge.comparator;

import org.springframework.stereotype.Component;

/**
 * Default comparator:
 * - Normalises line endings (CRLF → LF)
 * - Strips trailing whitespace per line
 * - Ignores trailing blank lines
 * - Does NOT collapse internal whitespace (preserves intentional spacing)
 */
@Component
public class ExactComparator implements OutputComparator {

    @Override
    public boolean matches(String expected, String actual) {
        if (expected == null && actual == null) return true;
        if (expected == null || actual == null) return false;

        String normalizedExpected = normalize(expected);
        String normalizedActual   = normalize(actual);

        return normalizedExpected.equals(normalizedActual);
    }

    private String normalize(String s) {
        // Normalise CRLF and CR to LF
        s = s.replace("\r\n", "\n").replace("\r", "\n");

        // Strip trailing whitespace from each line
        String[] lines = s.split("\n", -1);
        StringBuilder sb = new StringBuilder();
        for (String line : lines) {
            sb.append(line.stripTrailing()).append("\n");
        }

        // Remove trailing blank lines
        String result = sb.toString();
        while (result.endsWith("\n\n")) {
            result = result.substring(0, result.length() - 1);
        }

        // Ensure exactly one trailing newline
        return result.stripTrailing() + "\n";
    }
}
