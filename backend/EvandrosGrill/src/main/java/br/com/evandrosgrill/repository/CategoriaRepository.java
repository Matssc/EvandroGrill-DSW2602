package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.Categoria;
import br.com.evandrosgrill.model.enums.TipoCategoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    List<Categoria> findByUsuarioIdOrderByNomeAsc(Long usuarioId);

    // Listar só as categorias de compra ou só as de produto
    List<Categoria> findByUsuarioIdAndTipoOrderByNomeAsc(Long usuarioId, TipoCategoria tipo);

    // Busca segura: só retorna se a categoria for do usuário logado (RN10)
    Optional<Categoria> findByIdAndUsuarioId(Long id, Long usuarioId);

    // O mesmo nome pode existir em tipos diferentes (ex.: "Bebidas" de compra e de produto)
    boolean existsByUsuarioIdAndTipoAndNome(Long usuarioId, TipoCategoria tipo, String nome);

    // Usuário que ainda não tem nenhuma categoria recebe as padrão (CategoriaService)
    boolean existsByUsuarioId(Long usuarioId);
}
