package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.CartaoPj;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartaoPjRepository extends JpaRepository<CartaoPj, Long> {

    List<CartaoPj> findByUsuarioIdOrderByApelidoAsc(Long usuarioId);

    // Cartões disponíveis para escolher ao lançar uma compra
    List<CartaoPj> findByUsuarioIdAndAtivoTrueOrderByApelidoAsc(Long usuarioId);

    Optional<CartaoPj> findByIdAndUsuarioId(Long id, Long usuarioId);

    boolean existsByUsuarioIdAndApelido(Long usuarioId, String apelido);
}
