package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    List<Produto> findByUsuarioIdOrderByNomeAsc(Long usuarioId);

    Optional<Produto> findByIdAndUsuarioId(Long id, Long usuarioId);

    boolean existsByUsuarioIdAndCodigo(Long usuarioId, String codigo);

    // Filtro por categoria
    List<Produto> findByUsuarioIdAndCategoriaIdOrderByNomeAsc(Long usuarioId, Long categoriaId);

    // "24 produtos · 21 aparecem no cardápio"
    long countByUsuarioId(Long usuarioId);

    long countByUsuarioIdAndMostrarNoSiteTrue(Long usuarioId);

    // Cardápio da página pública (RN11): só o que está marcado para o site, destaques primeiro
    List<Produto> findByUsuarioIdAndMostrarNoSiteTrueOrderByDestaqueDescNomeAsc(Long usuarioId);

    // Campo "Buscar produto" (nome ou código)
    @Query("select p from Produto p "
            + "where p.usuario.id = :usuarioId "
            + "and (lower(p.nome) like lower(concat('%', :texto, '%')) "
            + "or lower(p.codigo) like lower(concat('%', :texto, '%'))) "
            + "order by p.nome")
    List<Produto> buscar(@Param("usuarioId") Long usuarioId, @Param("texto") String texto);
}
