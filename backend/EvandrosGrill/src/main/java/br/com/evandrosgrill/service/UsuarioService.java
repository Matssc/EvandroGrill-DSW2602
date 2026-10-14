package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import br.com.evandrosgrill.model.entity.Usuario;
import br.com.evandrosgrill.model.request.TrocarSenhaRequest;
import br.com.evandrosgrill.model.response.UsuarioResponse;
import br.com.evandrosgrill.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UsuarioResponse buscar(Long usuarioId) {
        return UsuarioResponse.de(buscarEntidade(usuarioId));
    }

    @Transactional
    public void trocarSenha(Long usuarioId, TrocarSenhaRequest request) {
        Usuario usuario = buscarEntidade(usuarioId);

        if (!passwordEncoder.matches(request.senhaAtual(), usuario.getSenhaHash())) {
            throw new RegraNegocioException("A senha atual está incorreta");
        }

        // Só o hash (BCrypt) é guardado, nunca a senha
        usuario.setSenhaHash(passwordEncoder.encode(request.novaSenha()));
        usuarioRepository.save(usuario);
    }

    private Usuario buscarEntidade(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado"));
    }
}
