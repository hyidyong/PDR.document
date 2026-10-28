package com.modit.backend.service;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LocalFileStorage {
    private final Path root;
    public LocalFileStorage(@Value("${app.storage-root}") String root) { this.root = Path.of(root).toAbsolutePath().normalize(); }
    public String save(String projectId, String applicantId, MultipartFile file) {
        try {
            String key = projectId + "/" + applicantId + "/" + UUID.randomUUID();
            Path target = root.resolve(key).normalize();
            if (!target.startsWith(root)) throw new IllegalArgumentException("저장 경로가 올바르지 않습니다.");
            Files.createDirectories(target.getParent());
            try (var in = file.getInputStream()) { Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING); }
            return key;
        } catch (IOException e) { throw new IllegalStateException("파일 저장에 실패했습니다.", e); }
    }
    public Resource read(String key) {
        try {
            Path target = root.resolve(key).normalize();
            if (!target.startsWith(root) || !Files.isRegularFile(target)) throw new NoSuchElementException("파일을 찾을 수 없습니다.");
            return new UrlResource(target.toUri());
        } catch (IOException e) { throw new IllegalStateException("파일을 읽지 못했습니다.", e); }
    }
}
