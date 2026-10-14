package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.CredenciaisInvalidasException;
import br.com.evandrosgrill.model.entity.Usuario;
import br.com.evandrosgrill.model.request.LoginRequest;
import br.com.evandrosgrill.model.response.LoginResponse;
import br.com.evandrosgrill.model.response.UsuarioResponse;
import br.com.evandrosgrill.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        // E-mail inexistente e senha errada dão exatamente a mesma resposta
        Usuario usuario = usuarioRepository.findByEmail(request.email().trim())
                .filter(u -> passwordEncoder.matches(request.senha(), u.getSenhaHash()))
                .orElseThrow(CredenciaisInvalidasException::new);

        return new LoginResponse(tokenService.gerar(usuario), UsuarioResponse.de(usuario));
    }
}
