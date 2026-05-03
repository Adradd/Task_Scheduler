package app.CalendarApp.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.jspecify.annotations.NonNull;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.Customizer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.net.URI;

/**
 * Configures authentication, authorization, password encoding, OAuth login, and
 * CORS rules for the backend API.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    @Value("${google.oauth.frontend-url}")
    private String frontendUrl;

    /**
     * Provides the BCrypt password encoder used when accounts are created and
     * login credentials are verified.
     *
     * @return password encoder for account passwords
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Builds the Spring Security filter chain for public registration/login
     * endpoints and authenticated API access.
     *
     * @param http security builder supplied by Spring
     * @return configured security filter chain
     * @throws Exception when the filter chain cannot be built
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/").permitAll()
                .requestMatchers("/health").permitAll()
                .requestMatchers("/api/accounts").permitAll()
                .requestMatchers("/api/accounts/login").permitAll()
                .requestMatchers("/api/integrations/google/callback").permitAll()
                .requestMatchers("/api/integration.envs/google/callback").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .httpBasic(Customizer.withDefaults())
            .cors(Customizer.withDefaults());
        return http.build();
    }

    /**
     * Restricts cross-origin API requests to the configured frontend origin.
     *
     * @return MVC configurer containing API CORS mappings
     */
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                String[] allowedOrigins = Arrays.stream(frontendUrl.split(","))
                        .map(String::trim)
                        .map(SecurityConfig::toOrigin)
                        .filter(origin -> !origin.isEmpty())
                        .toArray(String[]::new);

                registry.addMapping("/api/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE")
                        .allowedHeaders("*");
            }
        };
    }

    private static String toOrigin(String url) {
        try {
            URI uri = URI.create(url);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return url;
            }
            int port = uri.getPort();
            String origin = uri.getScheme() + "://" + uri.getHost();
            return port == -1 ? origin : origin + ":" + port;
        } catch (IllegalArgumentException ex) {
            return url;
        }
    }
}
