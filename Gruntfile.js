module.exports = function(grunt) {

    // Project configuration:
    
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        
        concat: {
            build: {
                src: [
                    'core/actions.ts',
                    'core/characters.ts',
                    'core/combinators.ts',
                    'core/composite.ts',
                    'core/context.ts',
                    'core/errors.ts',
                    'core/parser.ts',
                    'core/parsers.ts',
                    'core/predicates.ts',
                    // 'core/reflection.ts',
                    'core/repeaters.ts',
                    'core/token.ts'
                ],
                dest: 'dist/petitparser.ts'
            }
        },
        
        ts: {
            options: {
                sourcemap: true,
                comments: true
            },
            build: {
                src: ['dist/petitparser.ts'],
                out: 'dist/petitparser.js'
            }
        }
    });

    // Load plugins:
    
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-ts');

    // Define tasks:
    
    grunt.registerTask('build', ['concat', 'ts']);
    grunt.registerTask('default', ['build']);
    
};
