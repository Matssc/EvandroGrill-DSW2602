package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

// Guarda as fotos dos produtos em uma pasta (app.upload.dir) e devolve o caminho curto que vai em foto_url.
// O nome do arquivo é sempre um UUID gerado aqui, então nada do que o usuário manda vira caminho no disco.
@Service
public class FotoService {

    /** Formatos aceitos: o tipo é conferido pelos primeiros bytes do arquivo, não pelo nome ou pelo Content-Type. */
    private enum Formato {
        JPEG("jpg", MediaType.IMAGE_JPEG),
        PNG("png", MediaType.IMAGE_PNG),
        WEBP("webp", MediaType.parseMediaType("image/webp"));

        final String extensao;
        final MediaType tipo;

        Formato(String extensao, MediaType tipo) {
            this.extensao = extensao;
            this.tipo = tipo;
        }

        static Optional<Formato> daExtensao(String extensao) {
            return Arrays.stream(values()).filter(f -> f.extensao.equals(extensao)).findFirst();
        }
    }

    private static final Pattern NOME_VALIDO = Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$");

    /** Prefixo do endereço público da foto (o nginx e o proxy do Angular repassam /api pro back). */
    public static final String CAMINHO_PUBLICO = "/api/publico/fotos/";

    private final Path pasta;

    public FotoService(@Value("${app.upload.dir:uploads}") String pasta) {
        this.pasta = Path.of(pasta).toAbsolutePath().normalize();
    }

    /** Valida e grava a foto. Devolve o endereço público, curto o bastante pra caber em foto_url. */
    public String salvar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new RegraNegocioException("Escolha uma foto para enviar");
        }
        Formato formato = detectar(arquivo);
        String nome = UUID.randomUUID() + "." + formato.extensao;
        try {
            Files.createDirectories(pasta);
            try (InputStream entrada = arquivo.getInputStream()) {
                Files.copy(entrada, pasta.resolve(nome));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível gravar a foto", e);
        }
        return CAMINHO_PUBLICO + nome;
    }

    public Resource carregar(String nome) {
        if (!NOME_VALIDO.matcher(nome).matches()) {
            throw new RecursoNaoEncontradoException("Foto não encontrada");
        }
        Path arquivo = pasta.resolve(nome).normalize();
        if (!arquivo.startsWith(pasta) || !Files.isRegularFile(arquivo)) {
            throw new RecursoNaoEncontradoException("Foto não encontrada");
        }
        return new PathResource(arquivo);
    }

    public MediaType tipoDe(String nome) {
        String extensao = nome.substring(nome.lastIndexOf('.') + 1);
        return Formato.daExtensao(extensao).map(f -> f.tipo).orElse(MediaType.APPLICATION_OCTET_STREAM);
    }

    private Formato detectar(MultipartFile arquivo) {
        byte[] inicio = new byte[12];
        int lidos;
        try (InputStream entrada = arquivo.getInputStream()) {
            lidos = entrada.readNBytes(inicio, 0, inicio.length);
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível ler a foto", e);
        }
        if (lidos >= 3 && (inicio[0] & 0xFF) == 0xFF && (inicio[1] & 0xFF) == 0xD8 && (inicio[2] & 0xFF) == 0xFF) {
            return Formato.JPEG;
        }
        if (lidos >= 8 && (inicio[0] & 0xFF) == 0x89 && inicio[1] == 'P' && inicio[2] == 'N' && inicio[3] == 'G'
                && inicio[4] == 0x0D && inicio[5] == 0x0A && inicio[6] == 0x1A && inicio[7] == 0x0A) {
            return Formato.PNG;
        }
        if (lidos >= 12 && inicio[0] == 'R' && inicio[1] == 'I' && inicio[2] == 'F' && inicio[3] == 'F'
                && inicio[8] == 'W' && inicio[9] == 'E' && inicio[10] == 'B' && inicio[11] == 'P') {
            return Formato.WEBP;
        }
        throw new RegraNegocioException("Envie uma imagem JPG, PNG ou WebP");
    }
}
