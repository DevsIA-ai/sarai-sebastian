# Cómo poner a funcionar la galería de fotos

Esta carpeta tiene una app web para que los invitados suban fotos durante la
boda de Michel y Asael. Para que funcione necesita un proyecto gratis de
Firebase (de Google) que guarde las fotos y los nombres. No se necesita
tarjeta de crédito ni pagar nada (plan gratuito "Spark").

> Importante: esta app se creó a partir de la plantilla de otro cliente, pero
> necesita su **propio proyecto de Firebase**, separado y nuevo. Nunca
> reutilices el proyecto de Firebase de otra boda/evento — se mezclarían las
> fotos y los invitados de ambos eventos en la misma base de datos.

Sigue estos pasos una sola vez, antes de la boda.

## 📍 Dónde nos quedamos

*(Actualiza esta lista conforme avances, para no perder el hilo si lo retomas
otro día.)*

Última actualización: 16 de agosto de 2026.

- [x] Proyecto de Firebase creado: `boda-michel-asael`
- [ ] Autenticación anónima activada (paso 2) — **revisar si ya se hizo**
- [x] Firestore Database creado — región `us-south1 (Dallas)`, modo producción
- [ ] Reglas de `firestore.rules` pegadas y publicadas — **revisar si ya se hizo**
- [ ] **🚧 Bloqueados en Storage (paso 4):** activar Storage exige el plan de
      pago Blaze, que exige una cuenta de facturación. La cuenta
      **"Mi cuenta de facturación"** (ID `01510A-601A22-305FD0`, la misma que
      ya se usa para la boda de Katia & Francisco) llegó a su límite máximo de
      proyectos vinculados y no deja agregar `boda-michel-asael`.
      - ❌ Se probó crear una cuenta de facturación nueva ("Facturación Michel
        y Asael") como alternativa, pero Google la cerró sola por revisión
        antifraude y no se puede reabrir por autoservicio. **Ese camino ya se
        descartó, no perder tiempo reintentándolo.**
      - ✅ En su lugar se envió el formulario oficial de Google *"Google Cloud
        Platform/API Project: Request Billing Quota Increase"*, pidiendo subir
        el límite de **"Mi cuenta de facturación"** a 10 proyectos. Enviado
        desde el correo `devsia.digital@gmail.com`.
      - ⏳ **Esperando la respuesta de Google por correo** (puede tardar de
        minutos a ~1 día).
      - **Siguiente paso en cuanto aprueben:** Firebase Console → proyecto
        `boda-michel-asael` → Storage → activar / subir a Blaze → elegir
        **"Mi cuenta de facturación"** (ya debería aparecer disponible en la
        lista) → seguir con el resto del paso 4 (pegar `storage.rules`).
- [ ] Reglas de `storage.rules` pegadas y publicadas
- [ ] App web registrada en Firebase y `firebase-config.js` actualizado con
      los datos reales (por ahora sigue con los placeholders `"TU_..."`)
- [ ] CORS configurado para el botón de descargar todo en .zip (paso 6.1)
- [x] Links `livePhotosLink` (en `index.html`) y `adminGalleryLink` (en
      `generar.html`) — usan rutas relativas a `galeria-fotos/`, así que ya
      funcionan solos porque todo el sitio se publica junto (mismo repo de
      GitHub / mismo hosting). No hace falta un link de Netlify aparte a
      menos que en el futuro decidan publicar la galería por separado.
- [ ] Probado de extremo a extremo (paso 9)

**No hay prisa ni riesgo mientras esto se resuelve:** la app ya tiene un
bloqueo automático por fecha (ver `GALLERY_OPEN_DATE` en `app.js`) que impide
que cualquiera la use o vea errores hasta el **19 de noviembre de 2026** (un
mes antes de la boda). Hay tiempo de sobra para terminar esto con calma.

## 1. Crear el proyecto de Firebase

1. Entra a **firebase.google.com** e inicia sesión con una cuenta de Google.
2. Haz clic en **"Ir a la consola"** → **"Crear un proyecto"**.
3. Ponle un nombre, por ejemplo `boda-michel-asael`. Puedes desactivar
   Google Analytics (no se necesita).
4. Espera a que se cree el proyecto.

## 2. Activar Autenticación anónima

> Nota: la consola de Firebase cambió de menú. Ya no existe "Compilación";
> ahora todo está agrupado en categorías. Authentication vive dentro de
> **"Seguridad"**, y Firestore/Storage dentro de **"Bases de datos y
> almacenamiento"**. Si tu consola sí muestra "Compilación", usa esa ruta.

1. En el menú izquierdo: **Seguridad → Authentication → Comenzar**.
2. Pestaña **"Sign-in method"** → selecciona **"Anónimo"** → actívalo → Guardar.

(Esto permite identificar cada celular sin pedir contraseña a los invitados.)

## 3. Activar Firestore Database

1. Menú izquierdo: **Bases de datos y almacenamiento → Firestore Database →
   Crear base de datos**.
2. Elige **"Iniciar en modo de producción"** (NO "modo de prueba") y la
   región más cercana (para Nuevo León, `us-south1 (Dallas)`; si no aparece,
   `us-central1 (Iowa)` también funciona bien).

   > ⚠️ Por qué "producción" y no "prueba": el "modo de prueba" dice que
   > todo queda abierto, pero solo por 30 días — pasado ese plazo, Firestore
   > cambia solo (automáticamente) las reglas a "denegar todo", sin avisar.
   > Como la boda es meses después, para ese día ya se habría vencido y la
   > app dejaría de funcionar sin que hicieras nada mal. El "modo de
   > producción" empieza denegando todo (verás un código con
   > `allow read, write: if false`), pero eso es temporal: en el siguiente
   > paso lo reemplazas con las reglas de `firestore.rules`, que **no
   > caducan** — se quedan así hasta que tú las cambies. Con "producción" no
   > habrá problemas de que se venza antes de la boda.
3. Cuando esté creada, ve a la pestaña **"Reglas"**, borra el contenido y
   pega TODO el contenido del archivo `firestore.rules` de esta carpeta.
4. Haz clic en **Publicar**.

## 4. Activar Storage (para las fotos)

> ⚠️ Google exige tener una cuenta de **Facturación de Cloud** (plan
> **Blaze**, "pago por uso") para poder activar Storage, aunque te quedes
> dentro del uso gratuito. Si te aparece esa pantalla, agrega una tarjeta y
> continúa — el plan Blaze sigue incluyendo gratis 5 GB de almacenamiento y
> 1 GB/día de descarga, de sobra para una boda. Para estar tranquilo, entra
> después a **Facturación → Presupuestos y alertas** en Google Cloud
> Console y crea una alerta de por ejemplo $1 USD, así te avisan por correo
> si algún día algo se saliera de lo gratuito.

1. Menú izquierdo: **Bases de datos y almacenamiento → Storage → Comenzar**.
2. Acepta el modo por defecto y la misma región.
3. Ve a la pestaña **"Rules"**, borra el contenido y pega TODO el contenido
   del archivo `storage.rules` de esta carpeta.
4. Haz clic en **Publicar**.

## 5. Registrar la app web y copiar la configuración

1. Ve a **Configuración del proyecto** (ícono de engrane, arriba a la
   izquierda) → pestaña **"General"**.
2. Baja hasta "Tus apps" → haz clic en el ícono **`</>`** (Web).
3. Ponle un apodo, por ejemplo `galeria-fotos`, y registra la app (no hace
   falta activar Firebase Hosting ahí).
4. Copia el objeto `firebaseConfig` que te muestra (tiene `apiKey`,
   `authDomain`, `projectId`, etc.).
5. Abre el archivo **`firebase-config.js`** de esta carpeta y reemplaza los
   valores `"TU_..."` con los que copiaste. Guarda el archivo.

## 6. Acceso de administradores

Esta app no tiene ningún botón ni campo de clave visible para entrar como
administradores — a propósito, para que ningún invitado lo encuentre. El
acceso funciona con un link secreto:

- El archivo `app.js` de esta carpeta tiene una constante `ADMIN_SECRET` con
  una clave larga generada al azar (distinta a la de cualquier otra boda).
- El archivo `generar.html` (la página privada donde generan las invitaciones,
  un nivel arriba de esta carpeta) tiene un botón **"Administrar Galería de
  Fotos"** que abre esta galería con `?admin=` seguido de esa misma clave al
  final de la URL.
- Al abrir ese link, la app reconoce la clave automáticamente y activa el
  modo administradores en ese celular/navegador (no hay que escribir nada).

No necesitan hacer nada más para que esto funcione — ya viene configurado.
Si algún día quieren cambiar la clave secreta (por ejemplo, si temen que se
filtró), generen una nueva y actualícenla en **dos lugares**: la constante
`ADMIN_SECRET` en `galeria-fotos/app.js`, y el `href` del botón "Administrar
Galería de Fotos" en `generar.html`. Deben quedar idénticas en ambos archivos.

## 6.1 Habilitar la descarga masiva de fotos (.zip)

Como administradores tienen un botón "Descargar todas las fotos (.zip)". Para
que funcione, Firebase Storage necesita permiso explícito (CORS) para que la
página pueda leer las fotos y armarlas en un .zip. Es un paso único, se hace
con una terminal que abre el propio navegador (no hay que instalar nada):

1. Entra a **console.cloud.google.com** con la misma cuenta de Google que
   usaste para Firebase, y arriba a la izquierda asegúrate de tener
   seleccionado el proyecto **`boda-michel-asael`** (o el nombre que le
   hayas puesto).
2. Arriba a la derecha, haz clic en el ícono de terminal **`>_`** ("Activar
   Cloud Shell"). Espera a que cargue (tarda unos segundos la primera vez).
3. Pega este comando y presiona Enter (crea un archivito de configuración):

   ```
   cat > cors.json << 'EOF'
   [
     {
       "origin": ["*"],
       "method": ["GET"],
       "maxAgeSeconds": 3600
     }
   ]
   EOF
   ```

4. Luego pega este otro comando y presiona Enter (cambia
   `boda-michel-asael` por el nombre real de tu proyecto si es distinto):

   ```
   gsutil cors set cors.json gs://boda-michel-asael.firebasestorage.app
   ```

5. Debería responder algo como `Setting CORS on gs://...` sin errores.

Con esto, el botón de descargar todo en .zip ya debería funcionar. Este paso
solo se hace una vez.

## 7. Publicar la página en internet

Para que el QR (o el botón "Sube tus Fotos Aquí" de la invitación principal)
funcione en la boda, la carpeta necesita estar en una dirección de internet
pública (no solo en tu computadora). La forma más fácil sin usar la terminal:

1. Entra a **Netlify** y crea una cuenta gratis.
2. Una vez dentro, busca la opción de arrastrar una carpeta para publicarla
   (**"Deploys" → "Drag and drop your site output folder here"**).
3. Arrastra esta carpeta completa (`galeria-fotos`) a esa zona.
4. En unos segundos te dará un link público, algo como
   `https://tu-sitio-123.netlify.app`. Ese es el link para el QR y para el
   botón de la invitación principal.

   (Opcional: en "Site settings" puedes cambiarle el nombre para que el
   link sea más bonito, por ejemplo `boda-michel-asael-fotos.netlify.app`.)

> Nota: si el sitio completo (la invitación, `generar.html` y esta carpeta
> `galeria-fotos`) se publica todo junto, en el mismo hosting, los botones
> "Sube tus Fotos Aquí" y "Administrar Galería de Fotos" **ya funcionan
> solos** — usan rutas relativas (`galeria-fotos/index.html`), no hace falta
> tocar nada. Solo sigue estos dos pasos si decides publicar esta carpeta
> por separado, en un dominio distinto:

5. En el archivo `index.html` de la invitación principal (la carpeta de
   arriba), busca el botón "Sube tus Fotos Aquí" (`id="livePhotosLink"`) y
   reemplaza su `href` por este link.
6. En `generar.html`, busca el botón "Administrar Galería de Fotos"
   (`id="adminGalleryLink"`) y reemplaza el dominio de su `href` por el mismo
   link (dejando el `?admin=...` al final tal cual está).

## 8. Generar el código QR (opcional)

1. Copia el link que te dio Netlify.
2. Busca en internet cualquier "generador de código QR" gratuito, pega el
   link, descarga la imagen del QR e imprímela o ponla en una pantalla en
   la boda.

## 9. Probar antes de la boda

> ⚠️ No pruebes `index.html` haciendo doble clic para abrirlo directamente
> desde la carpeta — los navegadores bloquean ese tipo de página por
> seguridad cuando se abre así. Primero publícala en Netlify (paso 7) y
> pruébala desde el link que te dio, eso sí funciona perfecto.

1. Abre el link desde tu celular.
2. Escribe un nombre, sube una foto de prueba.
3. Ábrelo desde otro celular (o pídele a alguien más) y confirma que la
   foto aparece ahí también.
4. Prueba borrar esa foto de prueba desde el celular que la subió (debe
   poder borrarla) y confirma que desde un tercer celular normal NO
   aparece el botón de borrar en fotos ajenas.
5. Abre `generar.html`, haz clic en "Administrar Galería de Fotos" y confirma
   que en esa pestaña sí puedes borrar cualquier foto.

## Notas

- El plan gratuito de Firebase incluye 1 GB de almacenamiento y varios GB
  de descarga al mes — de sobra para una boda. Las fotos se comprimen
  automáticamente antes de subirse para ahorrar espacio.
- Las fotos quedan guardadas de forma permanente después del evento, hasta
  que ustedes decidan borrarlas.
- Si algún día quieren cambiar la clave de administradores, ver el paso 6.
