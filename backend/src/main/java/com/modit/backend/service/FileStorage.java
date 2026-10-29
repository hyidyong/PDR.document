package com.modit.backend.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorage {
    String save(String projectId, String applicantId, MultipartFile file);
    Resource read(String key);
}
