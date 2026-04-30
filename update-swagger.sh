#!/bin/bash

# A quick way to update main.ts instead of a fragile replace_string_in_file

old_listen="await app.listen(config.PORT, config.HOST);"
new_listen=$(cat << 'SNIPPET'
  
  // Conditionally expose Swagger unless in strict production (or we can always expose it for CLI/SDK generation)
  if (config.NODE_ENV !== 'production' || process.env.EXPOSE_SWAGGER === 'true') {
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    const options = new DocumentBuilder()
      .setTitle('Absolo Cloud API')
      .setDescription('Control plane internal and public APIs.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.PORT, config.HOST);
SNIPPET
)

perl -i -pe "s/$old_listen/$new_listen/g" services/control-plane/src/main.ts
