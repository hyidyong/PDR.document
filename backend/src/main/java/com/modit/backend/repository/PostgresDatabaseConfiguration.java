package com.modit.backend.repository;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableTransactionManagement
@ConditionalOnProperty(name="app.repository.provider", havingValue="jdbc")
public class PostgresDatabaseConfiguration {
    @Bean(destroyMethod="close") HikariDataSource moditDataSource(
            @Value("${app.database.url}") String url,
            @Value("${app.database.username}") String username,
            @Value("${app.database.password}") String password,
            @Value("${app.database.role:modit_backend}") String databaseRole,
            @Value("${app.database.maximum-pool-size:5}") int maximumPoolSize) {
        if (url.isBlank() || username.isBlank() || password.isBlank())
            throw new IllegalStateException("JDBC 저장소에는 SUPABASE_DB_URL, SUPABASE_DB_USERNAME, SUPABASE_DB_PASSWORD가 필요합니다.");
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(maximumPoolSize);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(10_000);
        if (!databaseRole.matches("[a-z_][a-z0-9_]*")) throw new IllegalArgumentException("올바르지 않은 데이터베이스 역할 이름입니다.");
        config.setConnectionInitSql("set role " + databaseRole);
        config.setPoolName("modit-supabase-postgres");
        return new HikariDataSource(config);
    }

    @Bean JdbcClient jdbcClient(DataSource dataSource) { return JdbcClient.create(dataSource); }
    @Bean PlatformTransactionManager transactionManager(DataSource dataSource) { return new DataSourceTransactionManager(dataSource); }
}
