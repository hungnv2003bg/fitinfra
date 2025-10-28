package com.foxconn.sopchecklist.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Value("${storage.use-ftp:false}")
    private boolean useFtp;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if (!useFtp) {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            String location = "file:" + uploadPath.toString() + "/";
            registry.addResourceHandler("/files/**")
                    .addResourceLocations(location)
                    .setCachePeriod(3600);
        }
    }
}



