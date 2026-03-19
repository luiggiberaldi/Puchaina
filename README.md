# Calculadora Premium m²

Este proyecto es una calculadora de metros cuadrados con integración de tasa BCV y exportación a WhatsApp.

## Despliegue en Vercel

1. **Sube el código a GitHub**: Crea un repositorio en GitHub y sube todos los archivos de este proyecto.
2. **Conecta con Vercel**:
   - Ve a [vercel.com](https://vercel.com).
   - Haz clic en "Add New" -> "Project".
   - Importa tu repositorio de GitHub.
3. **Configuración del Proyecto**:
   - **Framework Preset**: Vite (Vercel lo detectará automáticamente).
   - **Build Command**: `npm run build`.
   - **Output Directory**: `dist`.
   - **Serverless Functions**: Vercel ejecutará automáticamente `server.ts` como una función si se configura correctamente, pero para este proyecto, asegúrate de que el comando de inicio sea compatible.
4. **Variables de Entorno**:
   - Si utilizas funciones de IA, añade `GEMINI_API_KEY`.
5. **¡Listo!**: Haz clic en "Deploy".

## Características

- Cálculo de área y costo por m².
- **Tasa BCV con Proxy**: Ahora utilizamos un servidor intermedio (Proxy) para obtener la tasa BCV. Esto soluciona los problemas de conexión (CORS) que algunos navegadores presentan al intentar conectar directamente con las APIs de divisas.
- **Persistencia Local**: Guarda tus mediciones, la última tasa BCV y tu número de WhatsApp automáticamente.
- **Exportación a WhatsApp**: Genera presupuestos detallados con un solo clic.
- **Diseño Moderno**: Interfaz limpia con animaciones suaves y modo proyecto.
- **Historial de Mediciones**: Gestiona múltiples ítems en un solo presupuesto.
