export const FABRIC_TEMPLATES = {
	buildGradle: (modId: string, modVersion: string, mavenGroup: string) => `
plugins {
	id 'fabric-loom' version '1.15-SNAPSHOT'
	id 'maven-publish'
}

version = '${modVersion}'
group = '${mavenGroup}'

base {
	archivesName = '${modId}'
}

repositories {
}

dependencies {
	minecraft "com.mojang:minecraft:1.21.11"
	mappings loom.officialMojangMappings()
	modImplementation "net.fabricmc:fabric-loader:0.18.4"
	modImplementation "net.fabricmc.fabric-api:fabric-api:0.141.3+1.21.11"
}

processResources {
	inputs.property "version", project.version

	filesMatching("fabric.mod.json") {
		expand "version": project.version
	}
}

tasks.withType(JavaCompile).configureEach {
	it.options.release = 21
}

java {
	withSourcesJar()
	sourceCompatibility = JavaVersion.VERSION_21
	targetCompatibility = JavaVersion.VERSION_21
}

jar {
	from("LICENSE") {
		rename { fileName -> "\${fileName}_\${project.base.archivesName.get()}" }
	}
}

publishing {
	publications {
		mavenJava(MavenPublication) {
			from components.java
		}
	}
	repositories {
	}
}
`,

	gradleProperties: (modId: string) => `
org.gradle.jvmargs=-Xmx2G
minecraft_version=1.21.11
loader_version=0.18.4
mod_version=1.0.0
maven_group=com.example
archives_base_name=${modId}
fabric_version=0.141.3+1.21.11
`,

	fabricModJson: (modId: string, modName: string, description: string, mavenGroup: string) => `
{
	"schemaVersion": 1,
	"id": "${modId}",
	"version": "\${version}",
	"name": "${modName}",
	"description": "${description}",
	"authors": [
		"Me"
	],
	"contact": {
		"homepage": "https://fabricmc.net/",
		"sources": "https://github.com/FabricMC/fabric-example-mod"
	},
	"license": "CC0-1.0",
	"icon": "assets/${modId}/icon.png",
	"environment": "*",
	"entrypoints": {
		"main": [
			"${mavenGroup}.${modId}.${modName.replace(/\s+/g, '')}"
		]
	},
	"mixins": [
		"${modId}.mixins.json"
	],
	"depends": {
		"fabricloader": ">=0.18.4",
		"minecraft": "~1.21.11",
		"java": ">=21",
		"fabric-api": "*"
	}
}
`,

	mixinJson: (modId: string, mavenGroup: string) => `
{
	"required": true,
	"minVersion": "0.8",
	"package": "${mavenGroup}.${modId}.mixin",
	"compatibilityLevel": "JAVA_21",
	"mixins": [
		"ExampleMixin"
	],
	"injectors": {
		"defaultRequire": 1
	}
}
`,

	mainClass: (modId: string, modName: string, mavenGroup: string) => {
		const className = modName.replace(/\s+/g, '');
		return `
package ${mavenGroup}.${modId};

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ${className} implements ModInitializer {
    public static final String MOD_ID = "${modId}";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	@Override
	public void onInitialize() {
		LOGGER.info("Hello Fabric world!");
	}
}
`;
	},

	mixinClass: (modId: string, mavenGroup: string) => `
package ${mavenGroup}.${modId}.mixin;

import net.minecraft.client.gui.screen.TitleScreen;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(TitleScreen.class)
public class ExampleMixin {
	@Inject(at = @At("HEAD"), method = "init()V")
	private void init(CallbackInfo info) {
		System.out.println("This line is printed by an example mod mixin!");
	}
}
`,

	settingsGradle: `
pluginManagement {
	repositories {
		maven {
			name = 'Fabric'
			url = 'https://maven.fabricmc.net/'
		}
		mavenCentral()
		gradlePluginPortal()
	}
}

rootProject.name = 'fabric-example-mod'
`,

	gradleWrapperProperties: `
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-9.2.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
};
