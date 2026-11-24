package br.com.evandrosgrill.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

// Segurança da API: login por JWT (sem sessão), rotas públicas, BCrypt e CORS.
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Segredo que assina os tokens (application-local.properties: app.jwt.secret), mínimo 32 caracteres
    @Value("${app.jwt.secret}")
    private String segredoJwt;

    // Quem pode chamar a API pelo navegador (o Angular roda em http://localhost:4200)
    @Value("${app.cors.origens:http://localhost:4200}")
    private String[] origensPermitidas;

    // Regras de acesso: login, cardápio, fotos e health são públicos; o resto exige token válido.
    @Bean
    public SecurityFilterChain filtros(HttpSecurity http) throws Exception {
        http
                // Sem sessão e sem cookie: o login é um token enviado a cada requisição, então não há CSRF
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(regras -> regras
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/login", "/api/publico/**", "/actuator/health").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));

        return http.build();
    }

    // Hash das senhas com BCrypt (a senha nunca é guardada em texto).
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Assina os tokens gerados no login (HS256 com o segredo app.jwt.secret).
    @Bean
    public JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(chave()));
    }

    // Valida a assinatura e a validade do token que chega no cabeçalho Authorization.
    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withSecretKey(chave())
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }

    // Origens, métodos e cabeçalhos que o navegador pode usar para chamar a API.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.asList(origensPermitidas));
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("*"));
        cors.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource fonte = new UrlBasedCorsConfigurationSource();
        fonte.registerCorsConfiguration("/**", cors);
        return fonte;
    }

    // Monta a chave HMAC a partir do segredo; falha na subida se tiver menos de 32 bytes.
    private SecretKey chave() {
        byte[] bytes = segredoJwt.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret precisa ter pelo menos 32 caracteres");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }
}
