package com.modit.backend.api;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ApiConfiguration implements WebMvcConfigurer {
    private final List<String> origins;
    public ApiConfiguration(@Value("${app.cors-origins:}") List<String> origins) { this.origins = origins; }
    @Override public void addCorsMappings(CorsRegistry registry) {
        if (!origins.isEmpty()) registry.addMapping("/api/**").allowedOrigins(origins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "OPTIONS").allowedHeaders("Authorization", "Content-Type", "X-Dev-Role");
    }
}
