package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.Configuracao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConfiguracaoRepository extends JpaRepository<Configuracao, Long> {

    // Cada usuário tem uma única configuração
    Optional<Configuracao> findByUsuarioId(Long usuarioId);

    boolean existsByUsuarioId(Long usuarioId);
}
