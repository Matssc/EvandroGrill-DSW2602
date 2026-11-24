package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FotoServiceTest {

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0, 1};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};
    private static final byte[] WEBP = {'R', 'I', 'F', 'F', 10, 0, 0, 0, 'W', 'E', 'B', 'P'};

    @TempDir
    Path pasta;

    private FotoService service;

    @BeforeEach
    void preparar() {
        service = new FotoService(pasta.toString());
    }

    private static MockMultipartFile arquivo(String nome, byte[] conteudo) {
        return new MockMultipartFile("arquivo", nome, "application/octet-stream", conteudo);
    }

    private static String nomeDe(String url) {
        return url.substring(FotoService.CAMINHO_PUBLICO.length());
    }

    @Test
    void salvaJpegPngEWebpComExtensaoDoFormatoReal() throws IOException {
        assertTrue(service.salvar(arquivo("a.txt", JPEG)).endsWith(".jpg"));
        assertTrue(service.salvar(arquivo("b.bin", PNG)).endsWith(".png"));
        assertTrue(service.salvar(arquivo("c", WEBP)).endsWith(".webp"));
    }

    @Test
    void urlFicaCurtaECabeEmFotoUrl() {
        String url = service.salvar(arquivo("foto.jpg", JPEG));
        assertTrue(url.startsWith(FotoService.CAMINHO_PUBLICO));
        assertTrue(url.length() < 255);
    }

    @Test
    void arquivoGravadoPodeSerLidoDeVolta() throws IOException {
        String nome = nomeDe(service.salvar(arquivo("foto.jpg", JPEG)));
        Resource recurso = service.carregar(nome);
        assertArrayEquals(JPEG, recurso.getContentAsByteArray());
        assertEquals(MediaType.IMAGE_JPEG, service.tipoDe(nome));
    }

    @Test
    void recusaArquivoQueNaoEImagemMesmoComNomeDeImagem() {
        MockMultipartFile falso = arquivo("foto.jpg", "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8));
        assertThrows(RegraNegocioException.class, () -> service.salvar(falso));
    }

    @Test
    void recusaArquivoVazioENulo() {
        assertThrows(RegraNegocioException.class, () -> service.salvar(arquivo("vazio.jpg", new byte[0])));
        assertThrows(RegraNegocioException.class, () -> service.salvar(null));
    }

    @Test
    void carregarRecusaNomesQueNaoSaoDoSistema() throws IOException {
        Files.writeString(pasta.resolve("segredo.txt"), "x");
        for (String nome : new String[]{"../segredo.txt", "segredo.txt", "..%2fsegredo.txt", "a.jpg",
                "00000000-0000-0000-0000-000000000000.exe"}) {
            assertThrows(RecursoNaoEncontradoException.class, () -> service.carregar(nome), nome);
        }
    }

    @Test
    void carregarDizNaoEncontradoQuandoOUuidNaoExiste() {
        assertThrows(RecursoNaoEncontradoException.class,
                () -> service.carregar("00000000-0000-0000-0000-000000000000.jpg"));
    }
}
