package br.com.evandrosgrill.service;

import br.com.evandrosgrill.model.entity.Usuario;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class TokenService {

    private final JwtEncoder jwtEncoder;

    // Quanto tempo o login vale (application.properties: app.jwt.expiracao-horas)
    @Value("${app.jwt.expiracao-horas:8}")
    private long expiracaoHoras;

    public String gerar(Usuario usuario) {
        Instant agora = Instant.now();

        JwtClaimsSet dados = JwtClaimsSet.builder()
                .issuer("evandrosgrill")
                .issuedAt(agora)
                .expiresAt(agora.plus(expiracaoHoras, ChronoUnit.HOURS))
                .subject(String.valueOf(usuario.getId()))
                .claim("email", usuario.getEmail())
                .build();

        // O cabeçalho precisa dizer HS256, o mesmo algoritmo do decodificador
        JwsHeader cabecalho = JwsHeader.with(MacAlgorithm.HS256).build();

        return jwtEncoder.encode(JwtEncoderParameters.from(cabecalho, dados)).getTokenValue();
    }
}
