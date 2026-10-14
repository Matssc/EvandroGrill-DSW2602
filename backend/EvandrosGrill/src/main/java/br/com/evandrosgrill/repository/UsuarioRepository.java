package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Login
    Optional<Usuario> findByEmail(String email);

    // Validar cadastro (email único)
    boolean existsByEmail(String email);
}
