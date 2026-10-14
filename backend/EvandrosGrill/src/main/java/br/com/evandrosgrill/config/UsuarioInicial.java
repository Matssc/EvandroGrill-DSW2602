package br.com.evandrosgrill.config;

import br.com.evandrosgrill.model.entity.Usuario;
import br.com.evandrosgrill.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Ao subir a aplicação com o banco vazio, cria o usuário do Evandro.
// O e-mail e a senha vêm do application-local.properties (app.admin.email e app.admin.senha).
// Se o banco já tem usuário, ou se essas propriedades não existem, não faz nada.
@Component
@RequiredArgsConstructor
public class UsuarioInicial implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UsuarioInicial.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.nome:Evandro}")
    private String nome;

    @Value("${app.admin.nome-negocio:Evandro's Grill}")
    private String nomeNegocio;

    @Value("${app.admin.email:}")
    private String email;

    @Value("${app.admin.senha:}")
    private String senha;

    @Override
    public void run(ApplicationArguments args) {
        if (usuarioRepository.count() > 0) {
            return;
        }
        if (email.isBlank() || senha.isBlank()) {
            log.warn("Banco sem usuário e app.admin.email / app.admin.senha não definidos: nenhum usuário foi criado");
            return;
        }

        Usuario usuario = new Usuario();
        usuario.setNome(nome);
        usuario.setNomeNegocio(nomeNegocio);
        usuario.setEmail(email.trim());
        usuario.setSenhaHash(passwordEncoder.encode(senha));
        usuarioRepository.save(usuario);

        log.info("Usuário inicial criado: {}", usuario.getEmail());
    }
}
